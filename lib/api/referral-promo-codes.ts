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

function normalizePromoCode(raw: Record<string, unknown>): ReferralPromoCode {
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    code: String(raw.code ?? ''),
    is_active: Boolean(raw.is_active),
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
 * GET    /api/admin/referral-promo-codes
 * POST   /api/admin/referral-promo-codes
 * PATCH  /api/admin/referral-promo-codes/:id/
 * DELETE /api/admin/referral-promo-codes/:id/  (deactivates)
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

  deactivate: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`api/admin/referral-promo-codes/${id}/`);
    } catch (err) {
      // Some backends return 204 No Content; treat empty/JSON parse failures on 2xx as success.
      if (err && typeof err === 'object' && 'status' in err) {
        const status = Number((err as { status?: unknown }).status);
        if (Number.isFinite(status) && status >= 200 && status < 300) {
          return;
        }
      }
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.toLowerCase().includes('unexpected end of json') ||
        message.toLowerCase().includes('failed to execute') ||
        message.toLowerCase().includes('json')
      ) {
        return;
      }
      throw err;
    }
  },
};
