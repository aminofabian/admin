import { UserRole } from '@/lib/constants/roles';

export interface BaseUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  project_id: number;
  created: string;
  modified: string;
}

export interface Agent extends BaseUser {
  role: 'agent';
}

export interface Manager extends BaseUser {
  role: 'manager';
}

export interface Staff extends BaseUser {
  role: 'staff';
  mobile_number?: string;
  min_amount?: string | number | null;
  max_amount?: string | number | null;
}

/** Player-saved instrument from GET player detail (shape from backend). */
export interface SavedPaymentMethod {
  id: number;
  provider_code?: string;
  method_type?: string;
  provider_ref_id?: string;
  provider_player_ref?: string;
  is_default?: boolean;
  is_active?: boolean;
  account_holder_name?: string | null;
  created_at?: string;
  updated_at?: string;
  card_last4?: string | null;
  card_holder_name?: string | null;
  expiry_date?: string | null;
  zip_code?: string | null;
  masked_card?: string | null;
  /** Alternate API shapes */
  payment_method?: string;
  payment_method_display?: string;
  account_name?: string;
  account_number?: string;
  account_info?: string;
  paypal_email?: string;
  payer_email?: string;
  customer_email?: string;
  email?: string;
}

export interface Player extends BaseUser {
  role: 'player';
  full_name: string;
  balance: string;
  winning_balance: string;
  cashout_limit?: string;
  locked_balance?: string;
  first_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  affiliated_by?: string | null;
  mobile_number?: string;
  dob?: string;
  state?: string;
  total_purchases?: number;
  total_cashouts?: number;
  total_transfers?: number;
  agent_id?: number;
  agent?: Agent | { id: number; username: string };
  agent_username?: string;
  company_id?: number;
  company_username?: string;
  created_by?: { id: number; username: string } | null;
  saved_payment_methods?: SavedPaymentMethod[];
  has_saved_payment_methods?: boolean;
}

export type User = Agent | Manager | Staff | Player;

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  mobile_number?: string;
  full_name?: string;
  dob?: string;
}

export interface CreatePlayerRequest {
  username: string;
  full_name: string;
  dob: string;
  email: string;
  mobile_number: string;
  password: string;
  role: 'player';
}

export interface UpdateUserRequest {
  is_active?: boolean;
  mobile_number?: string;
  full_name?: string;
  password?: string;
  confirm_password?: string;
  email?: string;
  dob?: string;
  state?: string;
  agent_id?: number;
  cashout_limit?: string;
}

export interface CheckPlayerGameBalanceRequest {
  game_id: number;
  player_id: string | number;
}

export interface CheckPlayerGameBalanceResponse {
  status: 'success' | 'error';
  balance: number;
  message: string;
}

export interface AgentDashboardStats {
  total_players: number;
  total_topup: number;
  total_cashout: number;
  payment_method_fee: number;
  affiliation_fee: number;
  total_earnings: number;
}

export interface AgentDashboardResponse {
  agent_id: number;
  agent_username: string;
  agent_stats: AgentDashboardStats;
}

