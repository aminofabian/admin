import { apiClient } from './client';
import type { 
  AffiliateDefaultSettings,
  UpdateAffiliateDefaultsRequest
} from '@/types';

// Affiliate Default Settings API (GET, PUT, PATCH only)
export const affiliateSettingsApi = {
  get: () =>
    apiClient.get<AffiliateDefaultSettings>('api/admin/affiliate-defaults'),

  update: (data: UpdateAffiliateDefaultsRequest) =>
    apiClient.put<AffiliateDefaultSettings>('api/admin/affiliate-defaults', data),

  patch: (data: UpdateAffiliateDefaultsRequest) =>
    apiClient.patch<AffiliateDefaultSettings>('api/admin/affiliate-defaults', data),
};
