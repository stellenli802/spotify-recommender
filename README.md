# Spotify Playlist Recommender

A web app that uses AI to suggest songs based on your Spotify playlists. Unlike Spotify's built-in recommendations that blend your entire listening history, this app analyzes the specific playlist you choose and finds songs that actually fit *that* vibe — with a clear reason for every suggestion.

## Features

- **Playlist-Specific Recommendations** — Pick any playlist and get songs tailored to its mood, genre, and energy. Your gym playlist won't leak into your study recommendations.
- **Two Discovery Modes**
  - *Recent Additions* — Follows the direction your playlist is evolving. Great for playlists you actively curate.
  - *Overall Style* — Matches the full playlist's sound. Best for established playlists with a clear identity.
- **Transparent Reasoning** — Every recommendation includes a plain-language explanation of why it fits your playlist.
- **Preview & Save** — Listen to suggestions via embedded Spotify players, then save the ones you like as a new private playlist on your Spotify account.

## How It Works

1. Sign in with your Spotify account (only playlist access is requested)
2. Choose a playlist from your library
3. Select a recommendation mode (Recent Additions or Overall Style)
4. The app sends your playlist's track list to an AI model, which analyzes genres, artists, energy, and mood
5. AI suggestions are matched to real Spotify tracks with album art, preview players, and direct links
6. Save your favorites as a new Spotify playlist with one click

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with session-based authentication
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Spotify OAuth (Authorization Code flow)
- **AI**: OpenAI (gpt-4o-mini) via Replit AI Integrations
- **Routing**: wouter (frontend), Express (backend)

## Setup

### Prerequisites

- A [Spotify Developer](https://developer.spotify.com/) account
- A Spotify app with a Client ID and Client Secret
- Node.js 20+
- PostgreSQL database

### Environment Variables

| Variable | Description |
|---|---|
| `SPOTIFY_CLIENT_ID` | From your Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | From your Spotify Developer Dashboard |
| `SESSION_SECRET` | Any random string for Express session encryption |
| `DATABASE_URL` | PostgreSQL connection string |

### Spotify App Configuration

In your Spotify Developer Dashboard, set the redirect URI to:

```
https://<your-domain>/api/auth/callback
```

### Running Locally

```bash
npm install
npm run db:push
npm run dev
```

The app starts on port 5000.

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/auth/login` | Initiates Spotify OAuth flow |
| `GET` | `/api/auth/callback` | Handles OAuth callback |
| `GET` | `/api/auth/me` | Returns current authenticated user |
| `GET` | `/api/auth/logout` | Destroys session and logs out |
| `GET` | `/api/playlists` | Lists the user's Spotify playlists |
| `POST` | `/api/source-playlist` | Sets which playlist to generate recommendations for |
| `GET` | `/api/dashboard` | Returns dashboard data (source playlist + recommendations) |
| `POST` | `/api/recommend` | Generates AI recommendations (`{ mode: "recent" \| "overall" }`) |
| `POST` | `/api/recommend/:id/save` | Saves a recommendation as a new Spotify playlist |

## Limitations

This app currently operates under Spotify's **Development Mode**, which has the following restrictions:

- Limited to **5 authorized Spotify users**
- Requires a **Spotify Premium** account
- Restricted to a single Client ID

To serve more users, the app would need to be approved for Spotify's **Extended Quota Mode** through their developer review process.

## License

MIT
