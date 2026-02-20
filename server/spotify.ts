import { storage } from "./storage";
import type { User } from "@shared/schema";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
].join(" ");

export function getAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
    show_dialog: "true",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

export async function getValidToken(user: User): Promise<string> {
  if (new Date() < new Date(user.tokenExpiresAt)) {
    return user.accessToken;
  }
  const data = await refreshAccessToken(user.refreshToken);
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await storage.upsertUser({
    ...user,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || user.refreshToken,
    tokenExpiresAt: expiresAt,
  });
  return data.access_token;
}

async function spotifyApi(token: string, path: string, options?: RequestInit) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return res;
}

export async function getMe(token: string) {
  const res = await spotifyApi(token, "/me");
  if (!res.ok) throw new Error(`Failed to get profile: ${res.status}`);
  return res.json() as Promise<{
    id: string;
    email: string;
    display_name: string;
    images: { url: string }[];
  }>;
}

export async function getUserPlaylists(token: string) {
  const playlists: any[] = [];
  let url = "/me/playlists?limit=50";
  while (url) {
    const res = await spotifyApi(token, url);
    if (!res.ok) throw new Error(`Failed to get playlists: ${res.status}`);
    const data = await res.json();
    playlists.push(...data.items);
    url = data.next ? data.next.replace("https://api.spotify.com/v1", "") : null;
  }
  return playlists;
}

export async function getPlaylistTracks(token: string, playlistId: string) {
  const tracks: any[] = [];
  let url = `/playlists/${playlistId}/tracks?limit=100&fields=items(track(uri,name,duration_ms,artists(name),album(name,images))),next`;
  while (url) {
    const res = await spotifyApi(token, url);
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
        return null;
      }
      throw new Error(`Failed to get tracks: ${res.status}`);
    }
    const data = await res.json();
    tracks.push(...(data.items || []));
    url = data.next ? data.next.replace("https://api.spotify.com/v1", "") : null;
  }
  return tracks;
}

function cleanSearchTerm(s: string): string {
  return s
    .replace(/\s*\(feat\..*?\)/gi, "")
    .replace(/\s*\(ft\..*?\)/gi, "")
    .replace(/\s*\(with.*?\)/gi, "")
    .replace(/\s*\[.*?\]/g, "")
    .replace(/\s*-\s*(Remaster|Remastered|Deluxe|Live|Acoustic|Remix|Radio Edit|Single Version).*$/gi, "")
    .trim();
}

export async function searchTrack(token: string, trackName: string, artistName: string): Promise<any | null> {
  const cleanTrack = cleanSearchTerm(trackName);
  const cleanArtist = cleanSearchTerm(artistName);

  const queries = [
    `track:${cleanTrack} artist:${cleanArtist}`,
    `${cleanTrack} ${cleanArtist}`,
    `${trackName} ${artistName}`,
  ];

  for (const q of queries) {
    const encoded = encodeURIComponent(q);
    const res = await spotifyApi(token, `/search?q=${encoded}&type=track&limit=3`);
    if (!res.ok) continue;
    const data = await res.json();
    const items = data.tracks?.items || [];

    if (items.length > 0) {
      const exact = items.find((item: any) =>
        item.name.toLowerCase().includes(cleanTrack.toLowerCase()) ||
        cleanTrack.toLowerCase().includes(item.name.toLowerCase())
      );
      return exact || items[0];
    }
  }

  return null;
}

export async function findDaylist(token: string): Promise<{ id: string; name: string; imageUrl: string | null } | null> {
  const playlists = await getUserPlaylists(token);
  const daylist = playlists.find(
    (p: any) => p.name && p.name.toLowerCase().includes("daylist") && p.owner?.id === "spotify"
  );
  if (!daylist) return null;
  return {
    id: daylist.id,
    name: daylist.name,
    imageUrl: daylist.images?.[0]?.url || null,
  };
}

export async function createPlaylist(token: string, userId: string, name: string, description: string = "") {
  const res = await spotifyApi(token, `/users/${userId}/playlists`, {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      public: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create playlist: ${text}`);
  }
  return res.json() as Promise<{
    id: string;
    external_urls: { spotify: string };
  }>;
}

export async function addTracksToPlaylist(token: string, playlistId: string, uris: string[]) {
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const res = await spotifyApi(token, `/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris: batch }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to add tracks: ${text}`);
    }
  }
}
