import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  RechargeBonusSettings,
  TransferBonusSettings,
  SignupBonusSettings,
  PurchaseBonusSettings,
  CreatePurchaseBonusRequest,
  UpdateBonusSettingsRequest,
  PaginatedResponse 
} from '@/types';

// Bonus Settings API
interface BonusListFilters {
  page?: number;
  page_size?: number;
}

// Purchase Bonuses API (Full CRUD)
export const purchaseBonusSettingsApi = {
  list: (filters?: BonusListFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.page) {
      params.append('page', String(filters.page));
    }
    
    if (filters?.page_size) {
      params.append('page_size', String(filters.page_size));
    }
    
    const queryString = params.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.BONUSES.PURCHASE}?${queryString}`
      : API_ENDPOINTS.BONUSES.PURCHASE;
    
    return apiClient.get<PaginatedResponse<PurchaseBonusSettings>>(url);
  },

  get: (id: number) =>
    apiClient.get<PurchaseBonusSettings>(`${API_ENDPOINTS.BONUSES.PURCHASE}${id}/`),

  create: (data: CreatePurchaseBonusRequest) =>
    apiClient.post<PurchaseBonusSettings>(API_ENDPOINTS.BONUSES.PURCHASE, data),

  update: (id: number, data: CreatePurchaseBonusRequest) =>
    apiClient.put<PurchaseBonusSettings>(`${API_ENDPOINTS.BONUSES.PURCHASE}${id}/`, data),

  patch: (id: number, data: UpdateBonusSettingsRequest) =>
    apiClient.patch<PurchaseBonusSettings>(`${API_ENDPOINTS.BONUSES.PURCHASE}${id}/`, data),

  delete: (id: number) =>
    apiClient.delete<void>(`${API_ENDPOINTS.BONUSES.PURCHASE}${id}/`),
};

// Recharge Bonuses API (GET, PUT, PATCH only)
export const rechargeBonusSettingsApi = {
  list: (filters?: BonusListFilters) => {
    const params = new URLSearchParams();
    
    if (filters?.page) {
      params.append('page', String(filters.page));
    }
    
    if (filters?.page_size) {
      params.append('page_size', String(filters.page_size));
    }
    
    const queryString = params.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.BONUSES.RECHARGE}?${queryString}`
      : API_ENDPOINTS.BONUSES.RECHARGE;
    
    return apiClient.get<PaginatedResponse<RechargeBonusSettings>>(url);
  },

  get: (id: number) =>
    apiClient.get<RechargeBonusSettings>(`${API_ENDPOINTS.BONUSES.RECHARGE}${id}/`),

  update: (id: number, data: UpdateBonusSettingsRequest) =>
    apiClient.put<RechargeBonusSettings>(`${API_ENDPOINTS.BONUSES.RECHARGE}${id}/`, data),

  patch: (id: number, data: UpdateBonusSettingsRequest) =>
    apiClient.patch<RechargeBonusSettings>(`${API_ENDPOINTS.BONUSES.RECHARGE}${id}/`, data),
};

// Transfer Bonuses API (GET, PUT, PATCH only)
export const transferBonusSettingsApi = {
  get: () =>
    apiClient.get<TransferBonusSettings>(API_ENDPOINTS.BONUSES.TRANSFER),

  update: (data: UpdateBonusSettingsRequest) =>
    apiClient.put<TransferBonusSettings>(API_ENDPOINTS.BONUSES.TRANSFER, data),

  patch: (data: UpdateBonusSettingsRequest) =>
    apiClient.patch<TransferBonusSettings>(API_ENDPOINTS.BONUSES.TRANSFER, data),
};

// Signup Bonuses API (GET, PUT, PATCH only)
export const signupBonusSettingsApi = {
  get: () =>
    apiClient.get<SignupBonusSettings>(API_ENDPOINTS.BONUSES.SIGNUP),

  update: (data: UpdateBonusSettingsRequest) =>
    apiClient.put<SignupBonusSettings>(API_ENDPOINTS.BONUSES.SIGNUP, data),

  patch: (data: UpdateBonusSettingsRequest) =>
    apiClient.patch<SignupBonusSettings>(API_ENDPOINTS.BONUSES.SIGNUP, data),
};
