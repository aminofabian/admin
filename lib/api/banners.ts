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
    // Check if we have file uploads (File objects)
    const hasFileUploads = 
      (data.web_banner instanceof File) || 
      (data.mobile_banner instanceof File) || 
      (data.banner_thumbnail instanceof File);
    
    if (hasFileUploads) {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Skip empty strings for optional fields
          if (typeof value === 'string' && value.trim() === '' && key !== 'title') {
            return; // Skip empty strings (except title which is required)
          }
          
          if (value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'boolean') {
            formData.append(key, String(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      console.log('🔄 Banner API Update (with files):', {
        id,
        hasFileUploads: true,
        dataKeys: Object.keys(data),
        isActive: data.is_active,
        webBannerType: data.web_banner instanceof File ? 'File' : typeof data.web_banner,
        mobileBannerType: data.mobile_banner instanceof File ? 'File' : typeof data.mobile_banner,
      });
      
      return apiClient.patch<Banner>(API_ENDPOINTS.BANNERS.DETAIL(id), formData);
    }
    
    // For simple updates without any file uploads, use JSON
    const jsonData: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      // Include null values (for clearing fields like redirect_url)
      if (value === null) {
        jsonData[key] = null;
        return;
      }
      
      if (value !== undefined) {
        // Skip empty strings for optional fields (like redirect_url) - but allow null
        if (typeof value === 'string' && value.trim() === '' && key !== 'title') {
          return; // Skip empty strings (except title which is required)
        }
        jsonData[key] = value;
      }
    });
    
    console.log('🔄 Banner API Update (JSON):', {
      id,
      hasFileUploads: false,
      jsonData,
      isActive: jsonData.is_active,
      isActiveType: typeof jsonData.is_active,
    });
    
    return apiClient.patch<Banner>(API_ENDPOINTS.BANNERS.DETAIL(id), jsonData);
  },

  delete: (id: number) => 
    apiClient.delete<void>(API_ENDPOINTS.BANNERS.DETAIL(id)),
};

