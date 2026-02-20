import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { randomBytes } from "crypto";
import { storage, db } from "./storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUrl, exchangeCode, getMe, getUserPlaylists, getPlaylistTracks, getValidToken, createPlaylist, addTracksToPlaylist } from "./spotify";
import { generateRecommendations } from "./recommend";
import { log } from "./index";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    oauthState?: string;
  }
}

async function getUser(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  function getRedirectUri(req: any): string {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
    return `${proto}://${host}/api/auth/callback`;
  }

  app.get("/api/auth/login", (req, res) => {
    const state = randomBytes(16).toString("hex");
    req.session.oauthState = state;
    const redirectUri = getRedirectUri(req);
    const url = getAuthUrl(redirectUri, state);
    res.redirect(url);
  });

  app.get("/api/auth/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        log(`OAuth error: ${error}`, "auth");
        return res.redirect("/?error=auth_denied");
      }

      if (!code || !state || state !== req.session.oauthState) {
        log("Invalid OAuth state or missing code", "auth");
        return res.redirect("/?error=invalid_state");
      }

      const redirectUri = getRedirectUri(req);
      const tokenData = await exchangeCode(code as string, redirectUri);
      const profile = await getMe(tokenData.access_token);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      const user = await storage.upsertUser({
        spotifyUserId: profile.id,
        email: profile.email || null,
        displayName: profile.display_name || profile.id,
        avatarUrl: profile.images?.[0]?.url || null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
      });

      req.session.userId = user.id;
      res.redirect("/dashboard");
    } catch (err: any) {
      log(`Auth callback error: ${err.message}`, "auth");
      res.redirect("/?error=auth_failed");
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      spotifyUserId: user.spotifyUserId,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });
  });

  app.get("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  app.get("/api/dashboard", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.userId;
    const sourcePlaylist = await storage.getSourcePlaylist(userId);

    const recs = await storage.getRecommendations(userId);
    const recsWithTracks = await Promise.all(
      recs.slice(0, 20).map(async (rec) => {
        const tracks = await storage.getRecommendedTracks(rec.id);
        return { ...rec, tracks };
      })
    );

    res.json({ sourcePlaylist, recommendations: recsWithTracks });
  });

  app.get("/api/playlists", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    try {
      const token = await getValidToken(user);
      const playlists = await getUserPlaylists(token);
      const formatted = playlists.map((p: any) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.images?.[0]?.url || null,
        trackCount: p.tracks?.total || 0,
        owner: p.owner?.display_name || p.owner?.id || "Unknown",
      }));
      res.json(formatted);
    } catch (err: any) {
      log(`Playlists error: ${err.message}`, "api");
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.post("/api/source-playlist", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { spotifyPlaylistId, name, imageUrl } = req.body;
    if (!spotifyPlaylistId || !name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sp = await storage.setSourcePlaylist({
      userId: req.session.userId,
      spotifyPlaylistId,
      name,
      imageUrl: imageUrl || null,
      isDaylistAttempt: false,
      enabled: true,
      lastError: null,
    });

    res.json(sp);
  });

  app.post("/api/recommend", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.userId;
    const { mode } = req.body;

    if (!mode || !["recent", "overall"].includes(mode)) {
      return res.status(400).json({ message: "Mode must be 'recent' or 'overall'" });
    }

    const user = await getUser(userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const sourcePlaylist = await storage.getSourcePlaylist(userId);
    if (!sourcePlaylist) {
      return res.status(400).json({ message: "No source playlist selected" });
    }

    try {
      const token = await getValidToken(user);
      const rawTracks = await getPlaylistTracks(token, sourcePlaylist.spotifyPlaylistId);

      if (!rawTracks || rawTracks.length === 0) {
        return res.status(400).json({ message: "Playlist is empty or inaccessible" });
      }

      const allTracks = rawTracks
        .filter((t: any) => t.track)
        .map((t: any) => ({
          name: t.track.name,
          artist: t.track.artists?.[0]?.name || "Unknown",
          album: t.track.album?.name,
        }));

      let tracksForAI: typeof allTracks;
      if (mode === "recent") {
        tracksForAI = allTracks.slice(-15);
      } else {
        if (allTracks.length <= 25) {
          tracksForAI = allTracks;
        } else {
          const step = Math.floor(allTracks.length / 25);
          tracksForAI = [];
          for (let i = 0; i < allTracks.length && tracksForAI.length < 25; i += step) {
            tracksForAI.push(allTracks[i]);
          }
        }
      }

      const { resolvedTracks } = await generateRecommendations(token, tracksForAI, mode, 10);

      const rec = await storage.createRecommendation({
        userId,
        sourcePlaylistId: sourcePlaylist.id,
        mode,
        savedPlaylistId: null,
        savedPlaylistUrl: null,
      });

      const trackRecords = resolvedTracks.map((t, i) => ({
        recommendationId: rec.id,
        position: i + 1,
        spotifyTrackId: t.spotifyTrackId || null,
        trackUri: t.trackUri || null,
        spotifyUrl: t.spotifyUrl || null,
        trackName: t.trackName,
        artistName: t.artistName,
        albumName: t.albumName || null,
        albumImageUrl: t.albumImageUrl || null,
        previewUrl: t.previewUrl || null,
        durationMs: t.durationMs || null,
        reason: t.reason || null,
      }));

      await storage.createRecommendedTracks(trackRecords);

      const savedTracks = await storage.getRecommendedTracks(rec.id);
      res.json({ recommendation: rec, tracks: savedTracks });
    } catch (err: any) {
      log(`Recommend error: ${err.message}`, "api");
      res.status(500).json({ message: "Failed to generate recommendations: " + err.message });
    }
  });

  app.post("/api/recommend/:id/save", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.userId;
    const recId = parseInt(req.params.id, 10);

    const user = await getUser(userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const rec = await storage.getRecommendation(recId);
    if (!rec || rec.userId !== userId) {
      return res.status(404).json({ message: "Recommendation not found" });
    }

    if (rec.savedPlaylistUrl) {
      return res.json({ url: rec.savedPlaylistUrl });
    }

    try {
      const token = await getValidToken(user);
      const tracks = await storage.getRecommendedTracks(recId);
      const uris = tracks.filter((t) => t.trackUri).map((t) => t.trackUri!);

      if (uris.length === 0) {
        return res.status(400).json({ message: "No tracks to save" });
      }

      const sourcePlaylist = await storage.getSourcePlaylist(userId);
      const date = new Date(rec.createdAt).toLocaleDateString();
      const playlistName = `Recs: ${sourcePlaylist?.name || "Playlist"} (${date})`;

      const playlist = await createPlaylist(
        token,
        user.spotifyUserId,
        playlistName,
        `AI recommendations based on ${rec.mode === "recent" ? "recent additions" : "overall style"}`
      );

      await addTracksToPlaylist(token, playlist.id, uris);
      await storage.updateRecommendationSaved(recId, playlist.id, playlist.external_urls.spotify);

      res.json({ url: playlist.external_urls.spotify });
    } catch (err: any) {
      log(`Save recommendation error: ${err.message}`, "api");
      res.status(500).json({ message: "Failed to save playlist" });
    }
  });

  return httpServer;
}
