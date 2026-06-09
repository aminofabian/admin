import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '@/types';

export type RouletteSpinAllowance = {
  id: number;
  company_id?: number;
  company_username?: string;
  spins_per_day: number;
  is_enabled: boolean;
  roulette_enabled: boolean;
  project_id?: number;
  set_by_id?: number;
  set_by_username?: string;
  created_at?: string;
  updated_at?: string;
};

export type SaveRouletteSpinAllowanceRequest = {
  spins_per_day: number;
  is_enabled: boolean;
  roulette_enabled: boolean;
};

type SpinAllowanceEnvelope = ApiResponse<
  RouletteSpinAllowance | PaginatedResponse<RouletteSpinAllowance>
>;

function normalizeAllowanceRow(raw: Record<string, unknown>): RouletteSpinAllowance {
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    company_id: typeof raw.company_id === 'number' ? raw.company_id : undefined,
    company_username:
      typeof raw.company_username === 'string' ? raw.company_username : undefined,
    spins_per_day: typeof raw.spins_per_day === 'number' ? raw.spins_per_day : 0,
    is_enabled: typeof raw.is_enabled === 'boolean' ? raw.is_enabled : false,
    roulette_enabled:
      typeof raw.roulette_enabled === 'boolean' ? raw.roulette_enabled : true,
    project_id: typeof raw.project_id === 'number' ? raw.project_id : undefined,
    set_by_id: typeof raw.set_by_id === 'number' ? raw.set_by_id : undefined,
    set_by_username:
      typeof raw.set_by_username === 'string' ? raw.set_by_username : undefined,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  };
}

function pickFirstAllowanceRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;

  const results = (value as Record<string, unknown>).results;
  if (!Array.isArray(results) || results.length === 0) return null;

  const first = results[0];
  if (first && typeof first === 'object') {
    return first as Record<string, unknown>;
  }

  return null;
}

function unwrapSpinAllowance(
  response:
    | SpinAllowanceEnvelope
    | PaginatedResponse<RouletteSpinAllowance>
    | RouletteSpinAllowance,
): RouletteSpinAllowance | null {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid spin allowance response');
  }

  if ('data' in response && response.data) {
    const fromResults = pickFirstAllowanceRow(response.data);
    if (fromResults) {
      return normalizeAllowanceRow(fromResults);
    }

    if (
      typeof response.data === 'object' &&
      response.data !== null &&
      'spins_per_day' in response.data
    ) {
      return normalizeAllowanceRow(response.data as Record<string, unknown>);
    }
  }

  const fromResults = pickFirstAllowanceRow(response);
  if (fromResults) {
    return normalizeAllowanceRow(fromResults);
  }

  if ('spins_per_day' in response) {
    return normalizeAllowanceRow(response as Record<string, unknown>);
  }

  return null;
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

    const allowance = unwrapSpinAllowance(response);
    if (!allowance) {
      throw new Error('Invalid spin allowance response');
    }

    return allowance;
  },
};
