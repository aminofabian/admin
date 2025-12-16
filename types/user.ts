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

export interface Player extends BaseUser {
  role: 'player';
  full_name: string;
  balance: string;
  winning_balance: string;
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

