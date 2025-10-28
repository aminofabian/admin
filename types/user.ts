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
}

export interface Player extends BaseUser {
  role: 'player';
  full_name: string;
  balance: string;
  winning_balance: string;
  mobile_number?: string;
  dob?: string;
  state?: string;
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
}

