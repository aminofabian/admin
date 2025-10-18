import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  CompanySettings,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyCreateResponse,
  CompanyUpdateResponse,
  PaginatedResponse 
} from '@/types';

// Company Settings API
interface CompanyListFilters {
  page?: number;
  page_size?: number;
  search?: string;
}

export const companySettingsApi = {
  list: (filters?: CompanyListFilters) => {
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
      ? `${API_ENDPOINTS.COMPANIES.LIST}?${queryString}`
      : API_ENDPOINTS.COMPANIES.LIST;
    
    return apiClient.get<PaginatedResponse<CompanySettings>>(url);
  },

  get: (id: number) =>
    apiClient.get<CompanySettings>(API_ENDPOINTS.COMPANIES.DETAIL(id)),

  create: (data: CreateCompanyRequest) => {
    const formData = new FormData();
    
    // Append required fields
    formData.append('project_name', data.project_name);
    formData.append('project_domain', data.project_domain);
    formData.append('admin_project_domain', data.admin_project_domain);
    formData.append('username', data.username);
    formData.append('password', data.password);
    formData.append('email', data.email);
    formData.append('service_email', data.service_email);
    formData.append('service_name', data.service_name);
    
    // Append optional fields
    if (data.game_api_url) {
      formData.append('game_api_url', data.game_api_url);
    }
    
    if (data.game_api_key) {
      formData.append('game_api_key', data.game_api_key);
    }
    
    if (data.service_creds) {
      formData.append('service_creds', data.service_creds);
    }
    
    if (data.logo) {
      formData.append('logo', data.logo);
    }
    
    if (data.is_active !== undefined) {
      formData.append('is_active', String(data.is_active));
    }
    
    return apiClient.post<CompanyCreateResponse>(API_ENDPOINTS.COMPANIES.LIST, formData);
  },

  update: (id: number, data: UpdateCompanyRequest) => {
    // Check if we have file uploads
    const hasFiles = 'logo' in data;
    
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
      
      return apiClient.put<CompanyUpdateResponse>(API_ENDPOINTS.COMPANIES.DETAIL(id), formData);
    }
    
    // For simple updates without files, use JSON
    return apiClient.put<CompanyUpdateResponse>(API_ENDPOINTS.COMPANIES.DETAIL(id), data);
  },

  patch: (id: number, data: UpdateCompanyRequest) => {
    // Check if we have file uploads
    const hasFiles = 'logo' in data;
    
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
      
      return apiClient.patch<CompanyUpdateResponse>(API_ENDPOINTS.COMPANIES.DETAIL(id), formData);
    }
    
    // For simple updates without files, use JSON
    return apiClient.patch<CompanyUpdateResponse>(API_ENDPOINTS.COMPANIES.DETAIL(id), data);
  },
};
