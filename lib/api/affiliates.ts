import { apiClient } from './client';
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
    apiClient.get<PaginatedResponse<Affiliate>>('api/admin/affiliates', {
      params: filters,
    }),

  update: async (id: number, data: UpdateAffiliateRequest) => {
    const response = await apiClient.patch<ApiResponse<Affiliate>>(
      `api/admin/affiliates/${id}/`, 
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
      'api/admin/add-manual-affiliate', 
      data
    );
    
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to add manual affiliate');
    }
    
    return response;
  },

  defaults: {
    get: (id: number) => 
      apiClient.get<AffiliateDefaults>(`api/admin/affiliate-defaults/${id}/`),

    update: (id: number, data: UpdateAffiliateDefaultsRequest) => 
      apiClient.patch<AffiliateDefaults>(`api/admin/affiliate-defaults/${id}/`, data),
  },
};

