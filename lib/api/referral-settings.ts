import { apiClient } from './client';
import type { ReferralSettings, UpdateReferralSettingsRequest } from '@/types';

export const referralSettingsApi = {
  get: () => apiClient.get<ReferralSettings>('api/admin/referral-settings'),

  patch: (id: number, data: UpdateReferralSettingsRequest) =>
    apiClient.patch<ReferralSettings>(`api/admin/referral-settings/${id}/`, data),
};
