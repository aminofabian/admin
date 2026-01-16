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
}

export interface PaymentMethodsResponseData {
  [key: string]: Omit<PaymentMethodBreakdown, 'payment_method'>;
}

export interface BonusAnalytics {
  total_bonus: number;
  purchase_bonus: number;
  average_purchase_bonus_percent: number;
  signup_bonus: number;
  first_deposit_bonus: number;
  transfer_bonus: number;
  average_transfer_bonus_percent: number;
}

// Game Analytics Types
export interface GameSummary {
  total_recharge: number;
  total_bonus: number;
  average_bonus_percent: number;
  total_redeem: number;
  net_game_activity: number;
}

export interface GameByGame {
  game_id: number;
  game_title: string;
  recharge: number;
  bonus: number;
  average_bonus_percent: number;
  redeem: number;
  net_game_activity: number;
}

// Filter Types
export interface AnalyticsFilters extends Record<string, string | number | boolean | undefined> {
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

