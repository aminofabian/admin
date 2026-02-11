import { apiClient } from './client';
import type { 
  CompanySettings,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyCreateResponse,
  CompanyUpdateResponse,
  PaginatedResponse 
} from '@/types';

// Company Settings API
interface CompanyListFilters extends Record<string, string | number | boolean | undefined> {
  page?: number;
  page_size?: number;
  search?: string;
}

export const companySettingsApi = {
  list: (filters?: CompanyListFilters) => {
    return apiClient.get<PaginatedResponse<CompanySettings>>('api/admin/companies', {
      params: filters,
    });
  },

  get: (id: number) =>
    apiClient.get<CompanySettings>(`api/admin/companies/${id}`),

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
    
    if (data.btcpay_api_key) {
      formData.append('btcpay_api_key', data.btcpay_api_key);
    }
    
    if (data.btcpay_store_id) {
      formData.append('btcpay_store_id', data.btcpay_store_id);
    }
    
    if (data.btcpay_webhook_secret) {
      formData.append('btcpay_webhook_secret', data.btcpay_webhook_secret);
    }

    if (data.binpay_withdrawal_secret_key) {
      formData.append('binpay_withdrawal_secret_key', data.binpay_withdrawal_secret_key);
    }

    if (data.tierlock_merchant_id) {
      formData.append('tierlock_merchant_id', data.tierlock_merchant_id);
    }

    if (data.tierlock_merchant_secret) {
      formData.append('tierlock_merchant_secret', data.tierlock_merchant_secret);
    }

    if (data.tierlock_webhook_secret) {
      formData.append('tierlock_webhook_secret', data.tierlock_webhook_secret);
    }

    if (data.tierlock_payout_shared_secret) {
      formData.append('tierlock_payout_shared_secret', data.tierlock_payout_shared_secret);
    }

    if (data.tierlock_payout_client_secret) {
      formData.append('tierlock_payout_client_secret', data.tierlock_payout_client_secret);
    }
    
    if (data.logo) {
      formData.append('logo', data.logo);
    }
    
    if ('is_active' in data && data.is_active !== undefined) {
      formData.append('is_active', String(data.is_active));
    }
    
    return apiClient.post<CompanyCreateResponse>('api/admin/companies', formData);
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
      
      return apiClient.put<CompanyUpdateResponse>(`api/admin/companies/${id}`, formData);
    }
    
    // For simple updates without files, use JSON
    return apiClient.put<CompanyUpdateResponse>(`api/admin/companies/${id}`, data);
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
      
      return apiClient.patch<CompanyUpdateResponse>(`api/admin/companies/${id}`, formData);
    }
    
    // For simple updates without files, use JSON
    return apiClient.patch<CompanyUpdateResponse>(`api/admin/companies/${id}`, data);
  },
};
