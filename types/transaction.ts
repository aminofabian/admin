export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'purchase' | 'cashout';
export type QueueType = 'recharge_game' | 'redeem_game' | 'add_user_game';
export type JournalEntry = 'debit' | 'credit';

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
  unique_id: string;
  role: string;
  action: string;
  remarks: string | null;
  created: string;
  updated: string;
}

export interface TransactionQueue {
  id: number;
  type: QueueType;
  status: TransactionStatus;
  user_id: number;
  game: string;
  game_code: string;
  amount: string;
  remarks: string;
  data: Record<string, unknown>;
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
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

