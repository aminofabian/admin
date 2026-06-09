import { apiClient } from './client';
import type { PaginatedResponse } from '@/types';

export type RouletteReward = {
  id: number;
  user_id?: number;
  user_username?: string;
  position: number;
  prize_type: string;
  prize: string;
  reward_type: string;
  amount: string;
  quantity: number;
  balance_type: string | null;
  created_at?: string;
};

type RouletteRewardsEnvelope = {
  status?: string;
  message?: string;
  data?: PaginatedResponse<RouletteReward>;
};

export type RouletteRewardsFilters = {
  page?: number;
  page_size?: number;
  username?: string;
};

export const rouletteRewardsApi = {
  list: async (filters?: RouletteRewardsFilters) => {
    const response = await apiClient.get<RouletteRewardsEnvelope>(
      'api/admin/roulette-rewards',
      { params: filters },
    );

    const data = response?.data;
    if (data && Array.isArray(data.results)) {
      return {
        count: data.count ?? data.results.length,
        next: data.next ?? null,
        previous: data.previous ?? null,
        results: data.results,
      } satisfies PaginatedResponse<RouletteReward>;
    }

    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    } satisfies PaginatedResponse<RouletteReward>;
  },
};
