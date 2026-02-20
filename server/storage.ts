import {
  type User, type InsertUser,
  type SourcePlaylist, type InsertSourcePlaylist,
  type Recommendation, type InsertRecommendation,
  type RecommendedTrack, type InsertRecommendedTrack,
  users, sourcePlaylists, recommendations, recommendedTracks,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getUserBySpotifyId(spotifyUserId: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;

  getSourcePlaylist(userId: number): Promise<SourcePlaylist | undefined>;
  setSourcePlaylist(data: InsertSourcePlaylist): Promise<SourcePlaylist>;

  createRecommendation(data: InsertRecommendation): Promise<Recommendation>;
  getRecommendations(userId: number): Promise<Recommendation[]>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  updateRecommendationSaved(id: number, playlistId: string, playlistUrl: string): Promise<void>;

  createRecommendedTracks(tracks: InsertRecommendedTrack[]): Promise<void>;
  getRecommendedTracks(recommendationId: number): Promise<RecommendedTrack[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserBySpotifyId(spotifyUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.spotifyUserId, spotifyUserId));
    return user;
  }

  async upsertUser(data: InsertUser): Promise<User> {
    const existing = await this.getUserBySpotifyId(data.spotifyUserId);
    if (existing) {
      const [updated] = await db
        .update(users)
        .set(data)
        .where(eq(users.spotifyUserId, data.spotifyUserId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(users).values(data).returning();
    return created;
  }

  async getSourcePlaylist(userId: number): Promise<SourcePlaylist | undefined> {
    const [sp] = await db
      .select()
      .from(sourcePlaylists)
      .where(and(eq(sourcePlaylists.userId, userId), eq(sourcePlaylists.enabled, true)));
    return sp;
  }

  async setSourcePlaylist(data: InsertSourcePlaylist): Promise<SourcePlaylist> {
    await db
      .update(sourcePlaylists)
      .set({ enabled: false })
      .where(eq(sourcePlaylists.userId, data.userId));

    const [created] = await db.insert(sourcePlaylists).values(data).returning();
    return created;
  }

  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    const [created] = await db.insert(recommendations).values(data).returning();
    return created;
  }

  async getRecommendations(userId: number): Promise<Recommendation[]> {
    return db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(desc(recommendations.createdAt));
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    const [rec] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return rec;
  }

  async updateRecommendationSaved(id: number, playlistId: string, playlistUrl: string): Promise<void> {
    await db.update(recommendations).set({
      savedPlaylistId: playlistId,
      savedPlaylistUrl: playlistUrl,
    }).where(eq(recommendations.id, id));
  }

  async createRecommendedTracks(tracks: InsertRecommendedTrack[]): Promise<void> {
    if (tracks.length === 0) return;
    await db.insert(recommendedTracks).values(tracks);
  }

  async getRecommendedTracks(recommendationId: number): Promise<RecommendedTrack[]> {
    return db
      .select()
      .from(recommendedTracks)
      .where(eq(recommendedTracks.recommendationId, recommendationId))
      .orderBy(recommendedTracks.position);
  }
}

export const storage = new DatabaseStorage();
