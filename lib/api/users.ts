import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Agent,
  Manager,
  Staff,
  Player,
  CreateUserRequest,
  UpdateUserRequest,
  PaginatedResponse
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
    apiClient.post<Manager>('api/admin/managers', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Manager>(`api/admin/managers/${id}`, data),
};

export const agentsApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Agent>>(API_ENDPOINTS.AGENTS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Agent>('api/admin/agents', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Agent>(`api/admin/agents/${id}`, data),
};

export const staffsApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Staff>>(API_ENDPOINTS.STAFFS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Staff>('api/admin/staffs', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Staff>(`api/admin/staffs/${id}`, data),
};

export const playersApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Player>>(API_ENDPOINTS.PLAYERS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Player>('api/admin/players', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Player>(`api/admin/players/${id}`, data),

  viewDetails: (id: number) => 
    apiClient.get<{ total_purchases: number; total_cashouts: number; total_transfers: number }>(
      `api/view-player/${id}`
    ),
};

