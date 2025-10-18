import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Agent,
  Manager,
  Staff,
  Player,
  CreateUserRequest,
  UpdateUserRequest,
  PaginatedResponse,
  Affiliate,
  UpdateAffiliateRequest,
  AddManualAffiliateRequest
} from '@/types';

interface UserFilters {
  search?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export const managersApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Manager>>(API_ENDPOINTS.MANAGERS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Manager>(API_ENDPOINTS.MANAGERS.LIST, data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Manager>(API_ENDPOINTS.MANAGERS.DETAIL(id), data),
};

export const agentsApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Agent>>(API_ENDPOINTS.AGENTS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Agent>(API_ENDPOINTS.AGENTS.LIST, data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Agent>(API_ENDPOINTS.AGENTS.DETAIL(id), data),
};

export const staffsApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Staff>>(API_ENDPOINTS.STAFFS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Staff>(API_ENDPOINTS.STAFFS.LIST, data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Staff>(API_ENDPOINTS.STAFFS.DETAIL(id), data),
};

export const playersApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Player>>(API_ENDPOINTS.PLAYERS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Player>(API_ENDPOINTS.PLAYERS.LIST, data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Player>(API_ENDPOINTS.PLAYERS.DETAIL(id), data),
};

export const affiliatesApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Affiliate>>(API_ENDPOINTS.AFFILIATES.LIST, {
      params: filters,
    }),

  update: (id: number, data: UpdateAffiliateRequest) => 
    apiClient.patch<{ status: string; message: string; data: Affiliate }>(
      API_ENDPOINTS.AFFILIATES.DETAIL(id), 
      data
    ),

  addManual: (data: AddManualAffiliateRequest) => 
    apiClient.post<{ status: string; message: string; data?: any }>(
      API_ENDPOINTS.AFFILIATES.ADD_MANUAL, 
      data
    ),
};

