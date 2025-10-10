export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'purchase' | 'cashout';
export type QueueType = 'recharge_game' | 'redeem_game' | 'add_user_game';

export interface Transaction {
  id: number;
  user_id: number;
  amount: string;
  status: TransactionStatus;
  transaction_id: string;
  operator: string;
  type: TransactionType;
  created: string;
  modified: string;
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
  type?: 'processing' | 'history';
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

