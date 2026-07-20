import { apiClient } from './client';
import type {
  CreateReferralPromoCodeRequest,
  ReferralPromoCode,
  UpdateReferralPromoCodeRequest,
} from '@/types';

type ListEnvelope =
  | ReferralPromoCode[]
  | {
      status?: string;
      data?: ReferralPromoCode[] | { results?: ReferralPromoCode[] };
      results?: ReferralPromoCode[];
    };

type ItemEnvelope =
  | ReferralPromoCode
  | {
      status?: string;
      data?: ReferralPromoCode;
    };

function coerceId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/** Correctly parse booleans — Boolean("false") is true, which is wrong. */
function coerceBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') {
      return false;
    }
  }
  if (value == null) return fallback;
  return Boolean(value);
}

function normalizePromoCode(raw: Record<string, unknown>): ReferralPromoCode {
  return {
    id: coerceId(raw.id),
    code: String(raw.code ?? ''),
    is_active: coerceBoolean(raw.is_active, false),
    total_signed_up_players:
      typeof raw.total_signed_up_players === 'number'
        ? raw.total_signed_up_players
        : Number.parseInt(String(raw.total_signed_up_players ?? '0'), 10) || 0,
    created: typeof raw.created === 'string' ? raw.created : undefined,
    modified: typeof raw.modified === 'string' ? raw.modified : undefined,
  };
}

function extractList(response: ListEnvelope | null | undefined): ReferralPromoCode[] {
  if (!response) return [];
  if (Array.isArray(response)) {
    return response.map((item) => normalizePromoCode(item as unknown as Record<string, unknown>));
  }

  const data = response.data;
  if (Array.isArray(data)) {
    return data.map((item) => normalizePromoCode(item as unknown as Record<string, unknown>));
  }
  if (data && typeof data === 'object' && Array.isArray(data.results)) {
    return data.results.map((item) =>
      normalizePromoCode(item as unknown as Record<string, unknown>),
    );
  }
  if (Array.isArray(response.results)) {
    return response.results.map((item) =>
      normalizePromoCode(item as unknown as Record<string, unknown>),
    );
  }
  return [];
}

function extractItem(response: ItemEnvelope | null | undefined): ReferralPromoCode | null {
  if (!response) return null;
  if ('code' in response && typeof (response as ReferralPromoCode).code === 'string') {
    return normalizePromoCode(response as unknown as Record<string, unknown>);
  }
  const data = (response as { data?: ReferralPromoCode }).data;
  if (data && typeof data === 'object') {
    return normalizePromoCode(data as unknown as Record<string, unknown>);
  }
  return null;
}

/**
 * Admin proxy for custom referral promo codes.
 *
 * GET    /api/admin/referral-promo-codes           → active + inactive
 * POST   /api/admin/referral-promo-codes
 * PATCH  /api/admin/referral-promo-codes/:id/      → { is_active: true|false }
 * DELETE /api/admin/referral-promo-codes/:id/      → permanently delete
 */
export const referralPromoCodesApi = {
  list: async (): Promise<ReferralPromoCode[]> => {
    const response = await apiClient.get<ListEnvelope>('api/admin/referral-promo-codes');
    return extractList(response);
  },

  create: async (payload: CreateReferralPromoCodeRequest): Promise<ReferralPromoCode> => {
    const response = await apiClient.post<ItemEnvelope>('api/admin/referral-promo-codes', payload);
    const created = extractItem(response);
    if (!created) throw new Error('Invalid promo code response');
    return created;
  },

  update: async (
    id: number,
    payload: UpdateReferralPromoCodeRequest,
  ): Promise<ReferralPromoCode> => {
    const response = await apiClient.patch<ItemEnvelope>(
      `api/admin/referral-promo-codes/${id}/`,
      payload,
    );
    const updated = extractItem(response);
    if (!updated) throw new Error('Invalid promo code response');
    return updated;
  },

  /** Deactivate or reactivate via PATCH { is_active }. */
  setActive: async (id: number, isActive: boolean): Promise<ReferralPromoCode> => {
    return referralPromoCodesApi.update(id, { is_active: isActive });
  },

  /** Permanently delete a promo code (distinct from deactivate). */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`api/admin/referral-promo-codes/${id}/`);
  },
};
