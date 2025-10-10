import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Affiliate,
  UpdateAffiliateRequest,
  AddManualAffiliateRequest,
  AffiliateDefaults,
  UpdateAffiliateDefaultsRequest,
  PaginatedResponse,
  ApiResponse 
} from '@/types';

interface AffiliateFilters {
  search?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export const affiliatesApi = {
  list: (filters?: AffiliateFilters) => 
    apiClient.get<PaginatedResponse<Affiliate>>(API_ENDPOINTS.AFFILIATES.LIST, {
      params: filters,
    }),

  update: (id: number, data: UpdateAffiliateRequest) => 
    apiClient.patch<ApiResponse<Affiliate>>(API_ENDPOINTS.AFFILIATES.DETAIL(id), data),

  addManual: (data: AddManualAffiliateRequest) => 
    apiClient.post<ApiResponse>(API_ENDPOINTS.AFFILIATES.ADD_MANUAL, data),

  defaults: {
    get: (id: number) => 
      apiClient.get<AffiliateDefaults>(`${API_ENDPOINTS.AFFILIATES.DEFAULTS}${id}/`),

    update: (id: number, data: UpdateAffiliateDefaultsRequest) => 
      apiClient.patch<AffiliateDefaults>(`${API_ENDPOINTS.AFFILIATES.DEFAULTS}${id}/`, data),
  },
};

