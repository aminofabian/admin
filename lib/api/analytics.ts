import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';

export interface AdminAnalyticsData {
  total_cash_in: number;
  total_cashout: number;
  total_players: number;
  total_agents: number;
  total_managers: number;
  total_staffs: number;
}

export interface AdminAnalyticsResponse {
  status: 'success' | 'error';
  data: AdminAnalyticsData;
  message?: string;
}

// Transaction Analytics Types
export interface TransactionSummary {
  total_purchase: number;
  total_cashout: number;
  total_transfer: number;
}

export interface PaymentMethodBreakdown {
  payment_method: string;
  purchase: number;
  bonus: number;
  average_bonus_pct: number;
  cashout: number;
  success_rate: number;
  average_transaction_size: number;
  usage_distribution_pct: number;
  type?: 'purchase' | 'cashout'; // Added to distinguish between purchase and cashout rows
}

export interface PaymentMethodMetrics {
  purchase: number;
  bonus: number;
  average_bonus_pct: number;
  cashout: number;
  success_rate: number;
  average_transaction_size: number;
  usage_distribution_pct: number;
}

/** One row from `data.purchase_methods` (totals grouped by payment method, e.g. Card, Cashapp). */
export interface PurchaseMethodGroupedRow {
  payment_method: string;
  payment_method_display?: string;
  purchase: number;
  bonus: number;
  average_bonus_pct: number;
  success_rate: number;
  average_transaction_size: number;
  usage_distribution_pct: number;
}

/** One row from `data.cashout_methods` (totals grouped by payment method). */
export interface CashoutMethodGroupedRow {
  payment_method: string;
  payment_method_display?: string;
  cashout: number;
  success_rate: number;
  average_transaction_size: number;
  usage_distribution_pct: number;
}

/** One row from `data.manual_adjustments` (totals grouped by adjustment type). */
export interface ManualAdjustmentRow {
  adjustment_type: string;
  adjustment_display?: string;
  amount: number;
}

export interface PaymentMethodsResponseData {
  purchases: {
    [key: string]: PaymentMethodMetrics;
  };
  cashouts: {
    [key: string]: PaymentMethodMetrics;
  };
  /** Optional grouped rows; when present, shown in a dedicated analytics section. */
  purchase_methods?: PurchaseMethodGroupedRow[];
  cashout_methods?: CashoutMethodGroupedRow[];
  manual_adjustments?: ManualAdjustmentRow[];
}

/** Bonus analytics `data` object from GET …/transactions/bonus (all numeric fields). */
export interface BonusAnalytics {
  total_bonus: number;
  purchase_bonus: number;
  average_purchase_bonus_pct: number;
  signup_bonus: number;
  average_signup_bonus: number;
  first_deposit_bonus: number;
  average_first_deposit_bonus_pct: number;
  transfer_bonus: number;
  average_transfer_bonus_pct: number;
  total_free_play: number;
  average_free_play: number;
  seized_or_tipped_fund: number;
}

// Game Analytics Types
export interface GameSummary {
  total_recharge: number;
  total_bonus: number;
  average_bonus_pct: number;
  total_redeem: number;
  net_game_activity: number;
}

export interface GameByGame {
  game_id?: number;
  game_code?: string;
  game_title: string;
  recharge: number;
  bonus: number;
  average_bonus_pct: number;
  redeem: number;
  net_game_activity: number;
}

// Filter Types
export interface AnalyticsFilters extends Record<string, string | number | boolean | undefined> {
  /** Backend interprets rolling calendar day boundaries in `timezone`; only with today/yesterday. */
  preset?: 'today' | 'yesterday';
  /** IANA zone, e.g. America/New_York — sent on every analytics range request. */
  timezone?: string;
  start_date?: string;
  end_date?: string;
  username?: string;
  state?: string;
  gender?: 'male' | 'female';
}

// API Response Types
export interface TransactionSummaryResponse {
  status: 'success' | 'error';
  data: TransactionSummary;
  message?: string;
}

export interface PaymentMethodsResponse {
  status: 'success' | 'error';
  data: PaymentMethodsResponseData;
  message?: string;
}

export interface BonusAnalyticsResponse {
  status: 'success' | 'error';
  data: BonusAnalytics;
  message?: string;
}

export interface GameSummaryResponse {
  status: 'success' | 'error';
  data: GameSummary;
  message?: string;
}

export interface GamesByGameResponse {
  status: 'success' | 'error';
  data: GameByGame[];
  message?: string;
}

export const analyticsApi = {
  getDashboard: () =>
    apiClient.get<AdminAnalyticsResponse>(API_ENDPOINTS.ANALYTICS.DASHBOARD),

  getTransactionSummary: (filters?: AnalyticsFilters) =>
    apiClient.get<TransactionSummaryResponse>(
      API_ENDPOINTS.ANALYTICS.TRANSACTIONS_SUMMARY,
      { params: filters },
    ),

  getPaymentMethods: (filters?: AnalyticsFilters) =>
    apiClient.get<PaymentMethodsResponse>(
      API_ENDPOINTS.ANALYTICS.TRANSACTIONS_PAYMENT_METHODS,
      { params: filters },
    ),

  getBonusAnalytics: (filters?: AnalyticsFilters) =>
    apiClient.get<BonusAnalyticsResponse>(
      API_ENDPOINTS.ANALYTICS.TRANSACTIONS_BONUS,
      { params: filters },
    ),

  getGameSummary: (filters?: AnalyticsFilters) =>
    apiClient.get<GameSummaryResponse>(
      API_ENDPOINTS.ANALYTICS.GAMES_SUMMARY,
      { params: filters },
    ),

  getGamesByGame: (filters?: AnalyticsFilters) =>
    apiClient.get<GamesByGameResponse>(
      API_ENDPOINTS.ANALYTICS.GAMES_BY_GAME,
      { params: filters },
    ),
};

