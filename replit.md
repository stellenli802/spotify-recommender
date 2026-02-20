# Spotify Playlist Recommender

## Overview
A web app that uses AI to suggest songs based on your Spotify playlists. Users connect their Spotify account, select a playlist, and get AI-powered recommendations based on either recent additions or the overall playlist style. Recommendations can be saved as new Spotify playlists.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Spotify OAuth (Authorization Code flow) - manual implementation
- **AI**: OpenAI via Replit AI Integrations (gpt-4o-mini for recommendations)
- **Routing**: wouter (frontend), Express (backend API)

## Key Files
- `shared/schema.ts` - Database schema (users, sourcePlaylists, recommendations, recommendedTracks)
- `server/routes.ts` - All API endpoints including OAuth flow and recommendation endpoints
- `server/spotify.ts` - Spotify Web API wrapper functions (auth, playlists, search, create)
- `server/recommend.ts` - AI recommendation engine using OpenAI
- `server/storage.ts` - Database access layer (DatabaseStorage class)
- `client/src/pages/landing.tsx` - Landing page with Spotify login
- `client/src/pages/dashboard.tsx` - Main dashboard with recommendation UI
- `client/src/components/playlist-picker.tsx` - Playlist selection dialog

## API Routes
- `GET /api/auth/login` - Initiates Spotify OAuth
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/me` - Get current user (session-based)
- `GET /api/auth/logout` - Destroy session
- `GET /api/dashboard` - Dashboard data (source playlist + recommendations with tracks)
- `GET /api/playlists` - List user's Spotify playlists
- `POST /api/source-playlist` - Set source playlist for recommendations
- `POST /api/recommend` - Generate AI recommendations (body: { mode: "recent" | "overall" })
- `POST /api/recommend/:id/save` - Save recommendation as Spotify playlist

## Environment Variables
- `SPOTIFY_CLIENT_ID` - From Spotify Developer Dashboard
- `SPOTIFY_CLIENT_SECRET` - From Spotify Developer Dashboard
- `SESSION_SECRET` - Express session secret
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (auto-provided by Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (auto-provided by Replit AI Integrations)

## Spotify Redirect URI
The redirect URI must be set in the Spotify Developer Dashboard to:
`https://<your-replit-url>/api/auth/callback`

## Running
- `npm run dev` - Start development server
- `npm run db:push` - Push schema to database

## Recommendation Flow
1. User selects a playlist via the picker dialog
2. Clicks "Based on Recent Additions" or "Based on Overall Style"
3. Backend fetches playlist tracks from Spotify API
4. Sends track list to OpenAI (gpt-4o-mini) with mode-specific prompt
5. AI returns song suggestions with reasons
6. Backend searches Spotify for each suggestion to get track URIs, album art, etc.
7. Results stored in DB and returned to frontend
8. User can save recommendations as a new private Spotify playlist
