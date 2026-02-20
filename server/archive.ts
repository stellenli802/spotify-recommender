import { createHash } from "crypto";
import { storage } from "./storage";
import { getValidToken, getPlaylistTracks, createPlaylist, addTracksToPlaylist } from "./spotify";
import type { User, SourcePlaylist } from "@shared/schema";
import { log } from "./index";

function computeSignature(trackUris: string[]): string {
  return createHash("sha256").update(trackUris.join(",")).digest("hex");
}

export interface ArchiveResult {
  archived: boolean;
  trackCount: number;
  snapshotId?: number;
  archivePlaylistUrl?: string;
  error?: string;
}

export async function archivePlaylist(
  user: User,
  sourcePlaylist: SourcePlaylist
): Promise<ArchiveResult> {
  try {
    const token = await getValidToken(user);
    const rawTracks = await getPlaylistTracks(token, sourcePlaylist.spotifyPlaylistId);

    if (rawTracks === null) {
      const errorMsg = "Playlist is restricted or not found (403/404)";
      await storage.updateSourcePlaylistError(sourcePlaylist.id, errorMsg);
      return { archived: false, trackCount: 0, error: errorMsg };
    }

    const tracks = rawTracks
      .filter((item: any) => item.track && item.track.uri)
      .map((item: any) => ({
        uri: item.track.uri,
        name: item.track.name || "Unknown",
        artist: item.track.artists?.map((a: any) => a.name).join(", ") || "Unknown",
        album: item.track.album?.name || "Unknown",
        albumImage: item.track.album?.images?.[item.track.album.images.length > 1 ? 1 : 0]?.url || null,
        durationMs: item.track.duration_ms || 0,
      }));

    if (tracks.length === 0) {
      await storage.updateSourcePlaylistError(sourcePlaylist.id, "Playlist has no tracks");
      return { archived: false, trackCount: 0, error: "Playlist has no tracks" };
    }

    const uris = tracks.map((t: any) => t.uri);
    const signature = computeSignature(uris);

    const latest = await storage.getLatestSnapshot(user.id, sourcePlaylist.id);
    if (latest && latest.signature === signature) {
      await storage.updateSourcePlaylistError(sourcePlaylist.id, null);
      log(`No changes for ${sourcePlaylist.name} (user ${user.spotifyUserId})`, "archive");
      return { archived: false, trackCount: tracks.length };
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16).replace("T", " ");
    const archiveName = `Daylist Archive — ${dateStr}`;
    const description = `Archived from "${sourcePlaylist.name}" on ${dateStr}`;

    const newPlaylist = await createPlaylist(token, user.spotifyUserId, archiveName, description);
    await addTracksToPlaylist(token, newPlaylist.id, uris);

    const snapshot = await storage.createSnapshot({
      userId: user.id,
      sourcePlaylistId: sourcePlaylist.id,
      signature,
      archivePlaylistId: newPlaylist.id,
      archivePlaylistUrl: newPlaylist.external_urls.spotify,
      trackCount: tracks.length,
      createdAt: now,
    });

    await storage.createSnapshotTracks(
      tracks.map((t: any, i: number) => ({
        snapshotId: snapshot.id,
        position: i,
        trackUri: t.uri,
        trackName: t.name,
        artistName: t.artist,
        albumName: t.album,
        albumImageUrl: t.albumImage,
        durationMs: t.durationMs,
      }))
    );

    await storage.updateSourcePlaylistError(sourcePlaylist.id, null);
    log(`Archived ${tracks.length} tracks for ${sourcePlaylist.name} -> ${archiveName}`, "archive");

    return {
      archived: true,
      trackCount: tracks.length,
      snapshotId: snapshot.id,
      archivePlaylistUrl: newPlaylist.external_urls.spotify,
    };
  } catch (err: any) {
    const errorMsg = err.message || "Unknown error";
    log(`Archive error for ${sourcePlaylist.name}: ${errorMsg}`, "archive");
    await storage.updateSourcePlaylistError(sourcePlaylist.id, errorMsg);
    return { archived: false, trackCount: 0, error: errorMsg };
  }
}

export async function runArchiveForAllUsers(): Promise<void> {
  const enabledPlaylists = await storage.getEnabledSourcePlaylists();
  log(`Running archive for ${enabledPlaylists.length} enabled playlist(s)`, "worker");

  for (const sp of enabledPlaylists) {
    try {
      const result = await archivePlaylist(sp.user, sp);
      log(
        `User ${sp.user.spotifyUserId}: ${result.archived ? "archived" : "no changes"} (${result.trackCount} tracks)`,
        "worker"
      );
    } catch (err: any) {
      log(`Worker error for user ${sp.user.spotifyUserId}: ${err.message}`, "worker");
    }
  }
}
