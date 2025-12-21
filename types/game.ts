export interface Game {
  id: number;
  title: string;
  code: string;
  game_category: string;
  game_status: boolean;
  dashboard_url?: string;
  playing_url?: string;
  created: string;
}

export interface UserGame {
  id: number;
  user_id: number;
  game_id: number;
  game: string;
  code: string;
  username: string;
  status: string;
  game_state: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerGame {
  id: number;
  game__id: number;
  username: string;
  game__title: string;
  status: 'active' | 'inactive';
  game_state: 'active' | 'inactive';
  created: string;
  modified: string;
}

export interface UpdateGameRequest {
  title?: string;
  game_status?: boolean;
  dashboard_url?: string;
  playing_url?: string;
}

export interface CheckStoreBalanceRequest {
  game_id: number;
}

export interface CheckStoreBalanceResponse {
  status: 'success' | 'error';
  total_balance?: number;
  message: string;
}

