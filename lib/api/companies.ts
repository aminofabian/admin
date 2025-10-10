import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Company, 
  CreateCompanyRequest, 
  UpdateCompanyRequest,
  PaginatedResponse,
  ApiResponse 
} from '@/types';

interface CompanyFilters {
  search?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export const companiesApi = {
  list: (filters?: CompanyFilters) => 
    apiClient.get<PaginatedResponse<Company>>(API_ENDPOINTS.COMPANIES.LIST, {
      params: filters,
    }),

  create: (data: CreateCompanyRequest) => 
    apiClient.post<ApiResponse<Company>>(API_ENDPOINTS.COMPANIES.LIST, data),

  update: (id: number, data: UpdateCompanyRequest) => 
    apiClient.put<ApiResponse<Company>>(API_ENDPOINTS.COMPANIES.DETAIL(id), data),

  partialUpdate: (id: number, data: Partial<UpdateCompanyRequest>) => 
    apiClient.patch<ApiResponse<Company>>(API_ENDPOINTS.COMPANIES.DETAIL(id), data),
};

