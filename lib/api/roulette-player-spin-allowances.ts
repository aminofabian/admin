import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '@/types';

/** Today's usage stats returned alongside the per-player allowance. */
export type PlayerRouletteSpinUsage = {
  date?: string;
  spins_per_day?: number;
  used_spins?: number;
  remaining_spins?: number;
  is_unlimited?: boolean;
  /** "player" when a per-player override is active, "company" when inherited. */
  allowance_source?: 'player' | 'company' | string;
  allowance_id?: number | null;
  player_allowance_id?: number | null;
  company_allowance_id?: number | null;
};

export type PlayerRouletteSpinAllowance = {
  id: number;
  company_id?: number;
  company_username?: string;
  player_id: number;
  player_username?: string;
  spins_per_day: number;
  is_enabled: boolean;
  project_id?: number;
  set_by_id?: number;
  set_by_username?: string;
  created_at?: string;
  updated_at?: string;
  usage?: PlayerRouletteSpinUsage;
};

export type SavePlayerRouletteSpinAllowanceRequest = {
  player_id: number;
  spins_per_day: number;
  is_enabled: boolean;
};

type PlayerSpinAllowanceListEnvelope = ApiResponse<
  PaginatedResponse<PlayerRouletteSpinAllowance> & { page?: number; page_size?: number }
>;
type PlayerSpinAllowanceItemEnvelope = ApiResponse<PlayerRouletteSpinAllowance>;

function isPlayerAllowance(value: unknown): value is PlayerRouletteSpinAllowance {
  return (
    !!value &&
    typeof value === 'object' &&
    'player_id' in (value as Record<string, unknown>) &&
    'spins_per_day' in (value as Record<string, unknown>)
  );
}

/**
 * Admin proxy endpoint for per-player roulette spin allowance overrides.
 *
 * GET  /api/admin/roulette/player-spin-allowances?player_id=… → first result (or null)
 * POST /api/admin/roulette/player-spin-allowances              → upsert
 */
export const playerRouletteSpinAllowancesApi = {
  get: async (playerId: number): Promise<PlayerRouletteSpinAllowance | null> => {
    const response = await apiClient.get<PlayerSpinAllowanceListEnvelope>(
      'api/admin/roulette/player-spin-allowances',
      { params: { player_id: playerId } },
    );

    const data = response?.data;
    if (data && Array.isArray(data.results) && data.results.length > 0) {
      return data.results[0];
    }
    return null;
  },

  save: async (
    payload: SavePlayerRouletteSpinAllowanceRequest,
  ): Promise<PlayerRouletteSpinAllowance> => {
    const response = await apiClient.post<PlayerSpinAllowanceItemEnvelope>(
      'api/admin/roulette/player-spin-allowances',
      payload,
    );

    if (response?.status === 'error') {
      throw new Error(response.message || 'Failed to save player spin allowance');
    }

    if (response?.data && isPlayerAllowance(response.data)) {
      return response.data;
    }

    // Some backends return the resource directly without an envelope.
    if (isPlayerAllowance(response as unknown)) {
      return response as unknown as PlayerRouletteSpinAllowance;
    }

    throw new Error('Invalid player spin allowance response');
  },
};
