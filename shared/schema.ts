import { sql } from "drizzle-orm";
import { pgTable, text, serial, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  spotifyUserId: text("spotify_user_id").notNull().unique(),
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
});

export const sourcePlaylists = pgTable("source_playlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  spotifyPlaylistId: text("spotify_playlist_id").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  isDaylistAttempt: boolean("is_daylist_attempt").default(false),
  enabled: boolean("enabled").default(true),
  lastError: text("last_error"),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sourcePlaylistId: integer("source_playlist_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  mode: text("mode").notNull(),
  savedPlaylistId: text("saved_playlist_id"),
  savedPlaylistUrl: text("saved_playlist_url"),
});

export const recommendedTracks = pgTable("recommended_tracks", {
  id: serial("id").primaryKey(),
  recommendationId: integer("recommendation_id").notNull(),
  position: integer("position").notNull(),
  spotifyTrackId: text("spotify_track_id"),
  trackUri: text("track_uri"),
  spotifyUrl: text("spotify_url"),
  trackName: text("track_name").notNull(),
  artistName: text("artist_name").notNull(),
  albumName: text("album_name"),
  albumImageUrl: text("album_image_url"),
  previewUrl: text("preview_url"),
  durationMs: integer("duration_ms"),
  reason: text("reason"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSourcePlaylistSchema = createInsertSchema(sourcePlaylists).omit({ id: true });
export const insertRecommendationSchema = createInsertSchema(recommendations).omit({ id: true });
export const insertRecommendedTrackSchema = createInsertSchema(recommendedTracks).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SourcePlaylist = typeof sourcePlaylists.$inferSelect;
export type InsertSourcePlaylist = z.infer<typeof insertSourcePlaylistSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type RecommendedTrack = typeof recommendedTracks.$inferSelect;
export type InsertRecommendedTrack = z.infer<typeof insertRecommendedTrackSchema>;
