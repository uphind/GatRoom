-- ============================================
-- Gat Room - Initial Database Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS / PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT NOT NULL,
  user_tag TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  avatar_emoji TEXT DEFAULT '🃏',
  default_buyin INTEGER DEFAULT 50,
  house_rules TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_user_tag ON public.profiles(user_tag);
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- ============================================
-- POKER TABLES
-- ============================================
CREATE TABLE public.poker_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  currency TEXT NOT NULL DEFAULT 'ILS',
  currency_symbol TEXT NOT NULL DEFAULT '₪',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poker_tables_created_by ON public.poker_tables(created_by);
CREATE INDEX idx_poker_tables_location ON public.poker_tables(latitude, longitude);

-- ============================================
-- TABLE MEMBERS
-- ============================================
CREATE TABLE public.table_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_removed BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, user_id)
);

CREATE INDEX idx_table_members_table ON public.table_members(table_id);
CREATE INDEX idx_table_members_user ON public.table_members(user_id);

-- ============================================
-- GAMES
-- ============================================
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  passcode TEXT NOT NULL,
  game_number SERIAL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_games_table ON public.games(table_id);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_games_created_by ON public.games(created_by);
CREATE INDEX idx_games_passcode ON public.games(passcode);

-- ============================================
-- GAME PLAYERS
-- ============================================
CREATE TABLE public.game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  total_buyin INTEGER NOT NULL DEFAULT 0,
  cashout_amount INTEGER,
  is_cashed_out BOOLEAN DEFAULT FALSE,
  cashed_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_players_game ON public.game_players(game_id);
CREATE INDEX idx_game_players_user ON public.game_players(user_id);

-- ============================================
-- GAME LOGS (audit trail)
-- ============================================
CREATE TABLE public.game_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_logs_game ON public.game_logs(game_id);
CREATE INDEX idx_game_logs_created_at ON public.game_logs(game_id, created_at DESC);

-- ============================================
-- FRIENDSHIPS
-- ============================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_friendships_user ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend ON public.friendships(friend_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Poker Tables
ALTER TABLE public.poker_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tables"
  ON public.poker_tables FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tables"
  ON public.poker_tables FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Table creator can update"
  ON public.poker_tables FOR UPDATE
  USING (auth.uid() = created_by);

-- Table Members
ALTER TABLE public.table_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view table members"
  ON public.table_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join tables"
  ON public.table_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own membership"
  ON public.table_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Games
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view games"
  ON public.games FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Game creator can update game"
  ON public.games FOR UPDATE
  USING (auth.uid() = created_by);

-- Game Players
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game players"
  ON public.game_players FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add players"
  ON public.game_players FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Game participants can update players"
  ON public.game_players FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Game Logs
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game logs"
  ON public.game_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create logs"
  ON public.game_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they are part of"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_logs;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to generate unique 4-digit user tag
CREATE OR REPLACE FUNCTION generate_user_tag()
RETURNS TEXT AS $$
DECLARE
  new_tag TEXT;
  tag_exists BOOLEAN;
BEGIN
  LOOP
    new_tag := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_tag = new_tag) INTO tag_exists;
    EXIT WHEN NOT tag_exists;
  END LOOP;
  RETURN new_tag;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER poker_tables_updated_at
  BEFORE UPDATE ON public.poker_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
