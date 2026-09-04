import { apiClient } from './client';

/** Full usage snapshot from GET /api/payments/cashout-24h-limit/ */
export type Cashout24hLimitSnapshot = {
  cashout_24h_limit: string | null;
  cashout_24h_limit_source: string;
  cashout_24h_completed_amount: string;
  cashout_24h_reserved_amount: string;
  cashout_24h_remaining_amount: string | null;
  cashout_24h_window_started_at: string;
  cashout_24h_as_of: string;
};

/** Company-default-only shape from GET/PATCH company config. */
export type Cashout24hCompanyDefault = {
  cashout_24h_limit: string | null;
};

type Envelope =
  | Cashout24hLimitSnapshot
  | Cashout24hCompanyDefault
  | {
      status?: string;
      data?: Cashout24hLimitSnapshot | Cashout24hCompanyDefault;
    };

function normalizeLimit(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  return String(raw);
}

function unwrap(response: Envelope | null | undefined): Record<string, unknown> {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid cashout 24h limit response');
  }
  const asRecord = response as Record<string, unknown>;
  if ('data' in asRecord && asRecord.data && typeof asRecord.data === 'object') {
    return asRecord.data as Record<string, unknown>;
  }
  return asRecord;
}

export function normalizeCashout24hSnapshot(
  response: Envelope | null | undefined,
): Cashout24hLimitSnapshot {
  const raw = unwrap(response);
  const limitRaw = raw.cashout_24h_limit;
  const remainingRaw = raw.cashout_24h_remaining_amount;

  return {
    cashout_24h_limit: normalizeLimit(limitRaw),
    cashout_24h_limit_source: String(raw.cashout_24h_limit_source ?? 'unlimited'),
    cashout_24h_completed_amount: String(raw.cashout_24h_completed_amount ?? '0.00'),
    cashout_24h_reserved_amount: String(raw.cashout_24h_reserved_amount ?? '0.00'),
    cashout_24h_remaining_amount:
      remainingRaw === null || remainingRaw === undefined ? null : String(remainingRaw),
    cashout_24h_window_started_at: String(raw.cashout_24h_window_started_at ?? ''),
    cashout_24h_as_of: String(raw.cashout_24h_as_of ?? ''),
  };
}

export function normalizeCashout24hCompanyDefault(
  response: Envelope | null | undefined,
): Cashout24hCompanyDefault {
  const raw = unwrap(response);
  return {
    cashout_24h_limit: normalizeLimit(raw.cashout_24h_limit),
  };
}

/**
 * GET/PATCH api/admin/cashout-24h-limit → /api/payments/cashout-24h-limit/
 *
 * - Company/manager GET without player_id → company default (or full snapshot for self)
 * - Admin GET ?player_id= → player usage snapshot
 * - PATCH body: { cashout_24h_limit: "5000.00" | null }  (string money or null)
 */
export const cashout24hLimitApi = {
  getCompanyDefault: async (): Promise<Cashout24hCompanyDefault> => {
    const response = await apiClient.get<Envelope>('api/admin/cashout-24h-limit');
    return normalizeCashout24hCompanyDefault(response);
  },

  getPlayerUsage: async (playerId: number): Promise<Cashout24hLimitSnapshot> => {
    const response = await apiClient.get<Envelope>('api/admin/cashout-24h-limit', {
      params: { player_id: playerId },
    });
    return normalizeCashout24hSnapshot(response);
  },

  /** PATCH company default. Pass null for unlimited. Amounts are two-decimal strings. */
  patchCompanyDefault: async (
    cashout_24h_limit: string | null,
  ): Promise<Cashout24hCompanyDefault> => {
    const response = await apiClient.patch<Envelope>('api/admin/cashout-24h-limit', {
      cashout_24h_limit,
    });
    return normalizeCashout24hCompanyDefault(response);
  },
};
