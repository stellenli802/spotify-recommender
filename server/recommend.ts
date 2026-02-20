import OpenAI from "openai";
import { searchTrack } from "./spotify";
import { storage } from "./storage";
import { log } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface TrackInfo {
  name: string;
  artist: string;
  album?: string;
}

interface AISuggestion {
  trackName: string;
  artistName: string;
  reason: string;
}

export async function generateRecommendations(
  token: string,
  tracks: TrackInfo[],
  mode: "recent" | "overall",
  count: number = 10
): Promise<{
  suggestions: AISuggestion[];
  resolvedTracks: Array<AISuggestion & {
    spotifyTrackId?: string;
    trackUri?: string;
    spotifyUrl?: string;
    albumName?: string;
    albumImageUrl?: string;
    previewUrl?: string;
    durationMs?: number;
  }>;
}> {
  const trackList = tracks.map((t, i) => `${i + 1}. "${t.name}" by ${t.artist}`).join("\n");

  const modePrompt = mode === "recent"
    ? `These are the most RECENTLY added tracks to this playlist. The user wants recommendations based on their current listening trend and recent taste. Focus on what direction their taste is heading.`
    : `These are tracks from across the ENTIRE playlist. The user wants recommendations that match the overall style, mood, and genre of this collection.`;

  const systemPrompt = `You are a music recommendation expert. You suggest songs that users would genuinely enjoy based on their playlist. Your recommendations MUST be real, well-known songs by real artists that are available on Spotify. Use the most common/official song title and primary artist name exactly as they appear on Spotify. Avoid obscure deep cuts that might not be on Spotify. Focus on quality matches.`;

  const userPrompt = `Here is a playlist with these tracks:

${trackList}

${modePrompt}

Suggest ${count} songs that are NOT already in this list. For each suggestion, provide:
1. The exact song name
2. The exact artist name
3. A brief reason (1 sentence) why this fits

Respond in valid JSON format only:
{
  "recommendations": [
    { "trackName": "Song Name", "artistName": "Artist Name", "reason": "Why this fits" }
  ]
}`;

  let suggestions: AISuggestion[] = [];
  let lastError: string = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      suggestions = (parsed.recommendations || []).filter(
        (s: any) => s.trackName && s.artistName
      );
      if (suggestions.length > 0) break;
      lastError = "AI returned empty recommendations";
    } catch (err: any) {
      lastError = err.message;
      log(`AI attempt ${attempt + 1} failed: ${lastError}`, "recommend");
    }
  }

  if (suggestions.length === 0) {
    throw new Error(`Failed to generate recommendations: ${lastError}`);
  }

  const resolvedTracks = await Promise.all(
    suggestions.map(async (suggestion) => {
      try {
        const result = await searchTrack(token, suggestion.trackName, suggestion.artistName);
        if (result) {
          return {
            ...suggestion,
            spotifyTrackId: result.id,
            trackUri: result.uri,
            spotifyUrl: result.external_urls?.spotify,
            albumName: result.album?.name,
            albumImageUrl: result.album?.images?.[0]?.url,
            previewUrl: result.preview_url,
            durationMs: result.duration_ms,
          };
        }
      } catch (err) {
        log(`Search failed for "${suggestion.trackName}" by ${suggestion.artistName}`, "recommend");
      }
      return { ...suggestion };
    })
  );

  return { suggestions, resolvedTracks };
}
