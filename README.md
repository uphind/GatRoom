# Gat Room - Poker Tracking App

A modern poker game tracking app built with React Native (Expo) and Supabase. Track games, manage tables, and see leaderboards with your friends.

## Features

- **Game Management**: Create and join poker games with 4-digit passcodes
- **Live Tracking**: Real-time buy-in, rebuy, and cash-out tracking
- **Swipe Gestures**: Quick actions via swipe on player cards
- **Table System**: Create tables linked to locations with GPS
- **Leaderboards**: View top performers by week, month, year, or all time
- **Friends**: Add friends via unique 5-digit IDs
- **Game Logs**: Full audit trail of all game actions
- **Game Summary**: End-game breakdown with top 3 podium

## Tech Stack

- **Frontend**: React Native (Expo SDK 54) + TypeScript
- **Backend**: Supabase (Auth, PostgreSQL, Realtime)
- **Navigation**: Expo Router (file-based)
- **Deployment**: Vercel (web)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` in the SQL Editor
3. Copy your project URL and anon key

### 3. Configure environment variables in Vercel

All environment variables are set in the **Vercel dashboard** (not a `.env` file):

1. Go to your Vercel project > **Settings** > **Environment Variables**
2. Add the following:

| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

> The `.env.example` file is just a reference for which variables are needed. It is never used by the deployed app.

For **local development only**, you can create a `.env.local` file (gitignored) with the same variables if you want to run the app locally.

### 4. Run the app locally (optional)

```bash
# Web
npm run web

# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

## Deploy to Vercel

```bash
# Option 1: Vercel CLI
npm i -g vercel
vercel

# Option 2: Connect GitHub repo in Vercel dashboard (recommended)
# Vercel auto-deploys on every push to main
```

## Project Structure

```
app/
  (auth)/          - Login & registration screens
  (tabs)/          - Main tab navigator (Games, Tables, Profile)
  game/            - Game screens (create, detail, add-player, summary, logs)
  table/           - Table screens (create, detail)
  friends.tsx      - Friends management
components/        - Reusable UI components
constants/         - Theme, currencies, emojis
lib/               - Supabase client, types, utilities, auth context
supabase/          - Database migrations
```

## License

MIT
