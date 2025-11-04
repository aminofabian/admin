export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'purchase' | 'cashout';
export type QueueType = 'recharge_game' | 'redeem_game' | 'add_user_game' | 'create_game';
export type JournalEntry = 'debit' | 'credit';
export type GameActionType = 'retry' | 'cancel' | 'complete';

export interface Transaction {
  id: string;
  user_username: string;
  user_email: string;
  amount: string;
  bonus_amount: string;
  status: TransactionStatus;
  type: TransactionType;
  operator: string;
  payment_method: string;
  currency: string;
  description: string;
  journal_entry: JournalEntry;
  previous_balance: string;
  new_balance: string;
  previous_winning_balance: string;
  new_winning_balance: string;
  unique_id: string;
  role: string;
  action: string;
  remarks: string | null;
  created: string;
  updated: string;
  payment_url?: string | null;
  invoice_url?: string;
}

export interface TransactionQueue {
  id: string;
  type: QueueType;
  status: TransactionStatus;
  user_id: number;
  user_username?: string;
  user_email?: string;
  operator?: string;
  game_username?: string;
  game: string;
  game_code: string;
  amount: string;
  bonus_amount?: string;
  new_game_balance?: string;
  remarks: string;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionFilters {
  search?: string;
  type?: 'processing' | 'history' | 'purchase' | 'cashout';
  txn?: 'purchases' | 'cashouts';
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface QueueFilters {
  type?: 'processing' | 'history' | QueueType;
  status?: TransactionStatus;
  user_id?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface GameActionRequest {
  txn_id: string | number;
  type: GameActionType;
  new_password?: string;
  new_balance?: string;
  new_username?: string;
}

export interface GameActionResponse {
  status: string;
  message: string;
  task_id?: string;
  queue_id: string | number;
}

