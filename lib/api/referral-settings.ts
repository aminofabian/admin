import { apiClient } from './client';
import type { ReferralSettings, UpdateReferralSettingsRequest } from '@/types';

type ReferralSettingsEnvelope =
  | ReferralSettings
  | {
      status?: string;
      data?: ReferralSettings | { results?: ReferralSettings[] };
      results?: ReferralSettings[];
    };

function extractSettings(response: ReferralSettingsEnvelope | null | undefined): ReferralSettings {
  if (!response) {
    throw new Error('Invalid referral settings response');
  }

  if ('id' in response && 'is_enabled' in response) {
    return response as ReferralSettings;
  }

  const wrapped = response as {
    data?: ReferralSettings | { results?: ReferralSettings[] };
    results?: ReferralSettings[];
  };

  const data = wrapped.data;
  if (data && typeof data === 'object' && 'id' in data && 'is_enabled' in data) {
    return data as ReferralSettings;
  }

  const results =
    (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)
      ? data.results
      : null) ??
    (Array.isArray(wrapped.results) ? wrapped.results : null);

  if (results && results.length > 0) {
    return results[0];
  }

  throw new Error('Invalid referral settings response');
}

export const referralSettingsApi = {
  get: async () => {
    const response = await apiClient.get<ReferralSettingsEnvelope>('api/admin/referral-settings');
    return extractSettings(response);
  },

  patch: async (id: number, data: UpdateReferralSettingsRequest) => {
    const response = await apiClient.patch<ReferralSettingsEnvelope>(
      `api/admin/referral-settings/${id}/`,
      data,
    );
    return extractSettings(response);
  },
};
