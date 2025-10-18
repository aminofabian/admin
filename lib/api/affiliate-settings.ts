import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  AffiliateDefaultSettings,
  UpdateAffiliateDefaultsRequest
} from '@/types';

// Affiliate Default Settings API (GET, PUT, PATCH only)
export const affiliateSettingsApi = {
  get: () =>
    apiClient.get<AffiliateDefaultSettings>(API_ENDPOINTS.AFFILIATES.DEFAULTS),

  update: (data: UpdateAffiliateDefaultsRequest) =>
    apiClient.put<AffiliateDefaultSettings>(API_ENDPOINTS.AFFILIATES.DEFAULTS, data),

  patch: (data: UpdateAffiliateDefaultsRequest) =>
    apiClient.patch<AffiliateDefaultSettings>(API_ENDPOINTS.AFFILIATES.DEFAULTS, data),
};
