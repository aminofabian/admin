import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Banner,
  CreateBannerRequest,
  UpdateBannerRequest,
  PaginatedResponse 
} from '@/types';

export const bannersApi = {
  list: () => 
    apiClient.get<PaginatedResponse<Banner>>(API_ENDPOINTS.BANNERS.LIST),

  create: (data: CreateBannerRequest) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value);
      }
    });
    return apiClient.post<Banner>(API_ENDPOINTS.BANNERS.LIST, formData);
  },

  update: (id: number, data: UpdateBannerRequest) => 
    apiClient.patch<Banner>(API_ENDPOINTS.BANNERS.DETAIL(id), data),

  delete: (id: number) => 
    apiClient.delete<void>(API_ENDPOINTS.BANNERS.DETAIL(id)),
};

