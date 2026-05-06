export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'purchase' | 'cashout' | 'add' | 'deduct';
export type QueueType = 'recharge_game' | 'redeem_game' | 'add_user_game' | 'create_game';
export type JournalEntry = 'debit' | 'credit';
export type GameActionType = 'retry' | 'cancel' | 'complete';

export interface Transaction {
  id: string;
  /** Player user id when returned by API (used to load email/phone for payout providers). */
  user_id?: number;
  user_username: string;
  user_email: string;
  amount: string;
  bonus_amount: string;
  status: TransactionStatus;
  type: TransactionType;
  /** Some history APIs send the row kind here when `type` is omitted or redundant. */
  txn_type?: TransactionType | string;
  operator: string;
  payment_method: string;
  provider?: string | null;
  currency: string;
  description: string;
  journal_entry: JournalEntry;
  previous_balance: string;
  new_balance: string;
  /** Omitted on some APIs (e.g. v1 transactions-history); UI treats missing as N/A. */
  previous_winning_balance?: string;
  new_winning_balance?: string;
  /** Ledger fields from v1 transactions-history */
  previous_cashout_limit?: string | null;
  new_cashout_limit?: string | null;
  new_locked_balance?: string | null;
  reason?: string | null;
  reason_display?: string | null;
  agent_id?: number;
  agent_username?: string;
  merchant_username?: string;
  unique_id: string;
  role: string;
  action: string;
  remarks: string | null;
  created: string; // Deprecated: use created_at instead
  updated: string; // Deprecated: use updated_at instead
  created_at: string;
  updated_at: string;
  payment_url?: string | null;
  invoice_url?: string;
  payment_details?: Record<string, unknown> | null;
  company_id?: number;
  company_username?: string;
  /** Provider-specific status when sent via "Send to X" (e.g. Binpay, Tierlock, Taparcadia) */
  binpay_status?: string | null;
  tierlock_status?: string | null;
  taparcadia_status?: string | null;
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
  company_id?: number;
  company_username?: string;
}

export interface TransactionFilters {
  search?: string;
  type?: 'processing' | 'history'; // Use type for processing/history views
  txn_type?: 'purchase' | 'cashout' | 'add' | 'deduct'; // Aligned with history type filter (no transfer)
  txn?: 'purchases' | 'cashouts';
  page?: number;
  page_size?: number;
  /** IANA zone; set client-side for correct date_from/date_to interpretation. */
  timezone?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface QueueFilters {
  type?: 'processing' | 'history' | QueueType;
  status?: TransactionStatus;
  user_id?: number;
  /** IANA zone; set client-side for correct date_from/date_to interpretation. */
  timezone?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface GameActionRequest {
  txn_id: string | number;
  type: GameActionType;
  new_password?: string;
  new_balance?: string;
  new_username?: string;
  game_username?: string; // For add_user_game and create_game types
  game_password?: string; // For add_user_game and create_game types
}

export interface GameActionResponse {
  status: string;
  message: string;
  task_id?: string;
  queue_id: string | number;
}

export interface ChatPurchase {
  id: string;
  user_id: number;
  amount: number;
  bonus_amount?: number; // Optional bonus amount
  status: string;
  transaction_id: string;
  operator: string; // Will be used as payment method
  payment_method?: string; // Alternative payment method field if available
  type: string;
}

export interface GameActivity {
  id: string;
  user_id: number;
  username: string;
  game_username?: string;
  full_name: string;
  game_id: number;
  game_title: string;
  game_code: string;
  amount: string;
  bonus_amount: string;
  total_amount: string;
  type: string;
  status: string;
  operator: string;
  remarks: string;
  created_at: string;
  // Additional fields from new API response structure
  updated_at?: string;
  user_email?: string;
  data?: {
    new_credits_balance?: number;
    new_winning_balance?: number;
    username?: string;
    [key: string]: unknown;
  };
}

