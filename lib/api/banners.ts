import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Banner,
  CreateBannerRequest,
  UpdateBannerRequest,
  PaginatedResponse 
} from '@/types';

interface ListFilters {
  page?: number;
  page_size?: number;
  search?: string;
}

export const bannersApi = {
  list: (filters?: ListFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.page) {
      params.append('page', String(filters.page));
    }
    
    if (filters?.page_size) {
      params.append('page_size', String(filters.page_size));
    }
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    
    const queryString = params.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.BANNERS.LIST}?${queryString}`
      : API_ENDPOINTS.BANNERS.LIST;
    
    return apiClient.get<PaginatedResponse<Banner>>(url);
  },

  get: (id: number) =>
    apiClient.get<Banner>(API_ENDPOINTS.BANNERS.DETAIL(id)),

  create: (data: CreateBannerRequest) => {
    const formData = new FormData();
    
    // Append text fields
    formData.append('title', data.title);
    formData.append('banner_type', data.banner_type);
    
    if (data.banner_category) {
      formData.append('banner_category', data.banner_category);
    }
    
    if (data.redirect_url) {
      formData.append('redirect_url', data.redirect_url);
    }
    
    if (data.is_active !== undefined) {
      formData.append('is_active', String(data.is_active));
    }
    
    // Append file fields
    if (data.web_banner) {
      formData.append('web_banner', data.web_banner);
    }
    
    if (data.mobile_banner) {
      formData.append('mobile_banner', data.mobile_banner);
    }
    
    if (data.banner_thumbnail) {
      formData.append('banner_thumbnail', data.banner_thumbnail);
    }
    
    return apiClient.post<Banner>(API_ENDPOINTS.BANNERS.LIST, formData);
  },

  update: (id: number, data: UpdateBannerRequest) => {
    // Check if we have file uploads
    const hasFiles = 'web_banner' in data || 'mobile_banner' in data || 'banner_thumbnail' in data;
    
    if (hasFiles) {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      return apiClient.patch<Banner>(API_ENDPOINTS.BANNERS.DETAIL(id), formData);
    }
    
    // For simple updates without files, use JSON
    return apiClient.patch<Banner>(API_ENDPOINTS.BANNERS.DETAIL(id), data);
  },

  delete: (id: number) => 
    apiClient.delete<void>(API_ENDPOINTS.BANNERS.DETAIL(id)),
};

