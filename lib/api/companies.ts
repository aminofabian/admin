import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Company, 
  CreateCompanyRequest, 
  UpdateCompanyRequest,
  PaginatedResponse 
} from '@/types';

interface CompanyFilters {
  search?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

// Helper to clean up optional fields - remove empty strings and problematic fields
type CleanableFields = {
  game_api_url?: string;
  game_api_key?: string;
  service_creds?: string;
  btcpay_api_key?: string;
  btcpay_store_id?: string;
  btcpay_webhook_secret?: string;
  binpay_api_key?: string;
  binpay_secret_key?: string;
  binpay_deposit_secret_key?: string;
};

const cleanCompanyData = <T extends CreateCompanyRequest | UpdateCompanyRequest>(
  data: T,
  isCreate: boolean = false
): T => {
  const cleaned = { ...data } as T & CleanableFields;
  
  // Remove empty strings from optional fields
  // These fields may exist on CreateCompanyRequest but not UpdateCompanyRequest
  const optionalFields: (keyof CleanableFields)[] = [
    'game_api_url', 
    'game_api_key', 
    'service_creds',
    'btcpay_api_key',
    'btcpay_store_id',
    'btcpay_webhook_secret',
    'binpay_api_key',
    'binpay_secret_key',
    'binpay_deposit_secret_key',
  ];
  optionalFields.forEach(field => {
    if (field in cleaned && cleaned[field] === '') {
      delete cleaned[field];
    }
  });
  
  // For create requests, completely remove game_api_url and game_api_key
  // These fields cause backend errors as they don't exist on the Users model
  // They may need to be set separately after company creation
  if (isCreate) {
    delete cleaned.game_api_url;
    delete cleaned.game_api_key;
  }
  
  return cleaned as T;
};

export const companiesApi = {
  list: (filters?: CompanyFilters) => 
    apiClient.get<PaginatedResponse<Company>>('api/admin/companies', {
      params: filters,
    }),

  create: (data: CreateCompanyRequest) => {
    const cleanedData = cleanCompanyData(data, true); // true = isCreate
    return apiClient.post<Company>('api/admin/companies', cleanedData);
  },

  update: (id: number, data: UpdateCompanyRequest) => {
    const cleanedData = cleanCompanyData(data);
    return apiClient.put<Company>(`api/admin/companies/${id}`, cleanedData);
  },

  partialUpdate: (id: number, data: Partial<UpdateCompanyRequest>) => {
    const cleanedData = cleanCompanyData(data as UpdateCompanyRequest);
    return apiClient.patch<Company>(`api/admin/companies/${id}`, cleanedData);
  },
};

