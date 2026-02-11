export interface Profile {
  id: string;
  email: string | null;
  username: string;
  user_tag: string;
  nickname: string;
  avatar_url: string | null;
  avatar_emoji: string;
  default_buyin: number;
  house_rules: string;
  created_at: string;
  updated_at: string;
}

export interface PokerTable {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  currency: string;
  currency_symbol: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TableMember {
  id: string;
  table_id: string;
  user_id: string;
  is_removed: boolean;
  joined_at: string;
}

export interface Game {
  id: string;
  table_id: string;
  status: 'live' | 'ended';
  passcode: string;
  game_number: number;
  created_by: string | null;
  created_at: string;
  ended_at: string | null;
  // Joined fields
  poker_table?: PokerTable;
  game_players?: GamePlayer[];
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id: string | null;
  player_name: string;
  total_buyin: number;
  cashout_amount: number | null;
  is_cashed_out: boolean;
  cashed_out_at: string | null;
  created_at: string;
  // Joined
  profile?: Profile;
}

export interface GameLog {
  id: string;
  game_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  // Joined
  actor?: Profile;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  // Joined
  friend?: Profile;
  user?: Profile;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}
