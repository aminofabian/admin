import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export type RouletteSpinAllowance = {
  id: number;
  company_id?: number;
  company_username?: string;
  spins_per_day: number;
  is_enabled: boolean;
  project_id?: number;
  set_by_id?: number;
  set_by_username?: string;
  created_at?: string;
  updated_at?: string;
};

export type SaveRouletteSpinAllowanceRequest = {
  spins_per_day: number;
  is_enabled: boolean;
};

type SpinAllowanceEnvelope = ApiResponse<RouletteSpinAllowance>;

function unwrapSpinAllowance(
  response: SpinAllowanceEnvelope | RouletteSpinAllowance,
): RouletteSpinAllowance {
  if (response && typeof response === 'object' && 'data' in response && response.data) {
    return response.data;
  }

  if (response && typeof response === 'object' && 'spins_per_day' in response) {
    return response as RouletteSpinAllowance;
  }

  throw new Error('Invalid spin allowance response');
}

export const rouletteSpinAllowancesApi = {
  get: async (): Promise<RouletteSpinAllowance | null> => {
    const response = await apiClient.get<SpinAllowanceEnvelope | RouletteSpinAllowance>(
      'api/admin/roulette-spin-allowances',
    );
    return unwrapSpinAllowance(response);
  },

  save: async (data: SaveRouletteSpinAllowanceRequest): Promise<RouletteSpinAllowance> => {
    const response = await apiClient.post<SpinAllowanceEnvelope>(
      'api/admin/roulette-spin-allowances',
      data,
    );

    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to save roulette spin allowance');
    }

    return unwrapSpinAllowance(response);
  },
};
