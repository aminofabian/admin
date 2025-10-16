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

  update: async (id: number, data: UpdateAffiliateRequest) => {
    const response = await apiClient.patch<ApiResponse<Affiliate>>(
      API_ENDPOINTS.AFFILIATES.DETAIL(id), 
      data
    );
    
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to update affiliate');
    }
    
    // Return unwrapped data
    return response.data!;
  },

  addManual: async (data: AddManualAffiliateRequest) => {
    const response = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.AFFILIATES.ADD_MANUAL, 
      data
    );
    
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to add manual affiliate');
    }
    
    return response;
  },

  defaults: {
    get: (id: number) => 
      apiClient.get<AffiliateDefaults>(`${API_ENDPOINTS.AFFILIATES.DEFAULTS}${id}/`),

    update: (id: number, data: UpdateAffiliateDefaultsRequest) => 
      apiClient.patch<AffiliateDefaults>(`${API_ENDPOINTS.AFFILIATES.DEFAULTS}${id}/`, data),
  },
};

