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
const cleanCompanyData = <T extends CreateCompanyRequest | UpdateCompanyRequest>(
  data: T,
  isCreate: boolean = false
): T => {
  const cleaned = { ...data };
  
  // Remove empty strings from optional fields
  const optionalFields: (keyof T)[] = ['game_api_url', 'game_api_key', 'service_creds'];
  optionalFields.forEach(field => {
    if (field in cleaned && cleaned[field] === '') {
      delete cleaned[field];
    }
  });
  
  // For create requests, completely remove game_api_url and game_api_key
  // These fields cause backend errors as they don't exist on the Users model
  // They may need to be set separately after company creation
  if (isCreate) {
    delete (cleaned as any).game_api_url;
    delete (cleaned as any).game_api_key;
  }
  
  return cleaned;
};

export const companiesApi = {
  list: (filters?: CompanyFilters) => 
    apiClient.get<PaginatedResponse<Company>>(API_ENDPOINTS.COMPANIES.LIST, {
      params: filters,
    }),

  create: (data: CreateCompanyRequest) => {
    const cleanedData = cleanCompanyData(data, true); // true = isCreate
    return apiClient.post<Company>('api/admin/companies', cleanedData);
  },

  update: (id: number, data: UpdateCompanyRequest) => {
    const cleanedData = cleanCompanyData(data);
    return apiClient.put<Company>(API_ENDPOINTS.COMPANIES.DETAIL(id), cleanedData);
  },

  partialUpdate: (id: number, data: Partial<UpdateCompanyRequest>) => {
    const cleanedData = cleanCompanyData(data as UpdateCompanyRequest);
    return apiClient.patch<Company>(`api/admin/companies/${id}`, cleanedData);
  },
};

