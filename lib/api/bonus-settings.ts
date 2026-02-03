import { apiClient } from './client';
import type { 
  RechargeBonusSettings,
  TransferBonusSettings,
  SignupBonusSettings,
  FirstPurchaseBonusSettings,
  PurchaseBonusSettings,
  CreatePurchaseBonusRequest,
  UpdateBonusSettingsRequest,
  PaginatedResponse 
} from '@/types';

// Bonus Settings API – all calls go through Next.js proxy (same origin, no CORS)
interface BonusListFilters {
  page?: number;
  page_size?: number;
}

// Purchase Bonuses API (Full CRUD)
export const purchaseBonusSettingsApi = {
  list: (filters?: BonusListFilters) => {
    const params: Record<string, string | number> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.page_size) params.page_size = filters.page_size;
    return apiClient.get<PaginatedResponse<PurchaseBonusSettings>>('api/admin/purchase-bonuses', { params });
  },

  get: (id: number) =>
    apiClient.get<PurchaseBonusSettings>(`api/admin/purchase-bonuses/${id}/`),

  create: (data: CreatePurchaseBonusRequest) =>
    apiClient.post<PurchaseBonusSettings>('api/admin/purchase-bonuses', data),

  update: (id: number, data: CreatePurchaseBonusRequest) =>
    apiClient.put<PurchaseBonusSettings>(`api/admin/purchase-bonuses/${id}/`, data),

  patch: (id: number, data: UpdateBonusSettingsRequest) =>
    apiClient.patch<PurchaseBonusSettings>(`api/admin/purchase-bonuses/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete<void>(`api/admin/purchase-bonuses/${id}/`),
};

// Recharge Bonuses API (GET, PUT, PATCH only)
export const rechargeBonusSettingsApi = {
  list: (filters?: BonusListFilters) => {
    const params: Record<string, string | number> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.page_size) params.page_size = filters.page_size;
    return apiClient.get<PaginatedResponse<RechargeBonusSettings>>('api/admin/recharge-bonuses', { params });
  },

  get: (id: number) =>
    apiClient.get<RechargeBonusSettings>(`api/admin/recharge-bonuses/${id}/`),

  update: (id: number, data: UpdateBonusSettingsRequest) =>
    apiClient.put<RechargeBonusSettings>(`api/admin/recharge-bonuses/${id}/`, data),

  patch: (id: number, data: UpdateBonusSettingsRequest) =>
    apiClient.patch<RechargeBonusSettings>(`api/admin/recharge-bonuses/${id}/`, data),
};

// Transfer Bonuses API (GET, PUT, PATCH only)
export const transferBonusSettingsApi = {
  get: () =>
    apiClient.get<TransferBonusSettings>('api/admin/transfer-bonuses'),

  update: (data: UpdateBonusSettingsRequest) =>
    apiClient.put<TransferBonusSettings>('api/admin/transfer-bonuses', data),

  patch: (data: UpdateBonusSettingsRequest) =>
    apiClient.patch<TransferBonusSettings>('api/admin/transfer-bonuses', data),
};

// Signup Bonuses API (GET, PUT, PATCH only)
export const signupBonusSettingsApi = {
  get: () =>
    apiClient.get<SignupBonusSettings>('api/admin/signup-bonuses'),

  update: (data: UpdateBonusSettingsRequest) =>
    apiClient.put<SignupBonusSettings>('api/admin/signup-bonuses', data),

  patch: (data: UpdateBonusSettingsRequest) =>
    apiClient.patch<SignupBonusSettings>('api/admin/signup-bonuses', data),
};

// First Purchase Bonuses API (GET, PUT, PATCH only)
export const firstPurchaseBonusSettingsApi = {
  list: (filters?: BonusListFilters) => {
    const params: Record<string, string | number> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.page_size) params.page_size = filters.page_size;
    return apiClient.get<PaginatedResponse<FirstPurchaseBonusSettings>>('api/admin/first-purchase-bonuses', { params });
  },

  get: (id: number) =>
    apiClient.get<FirstPurchaseBonusSettings>(`api/admin/first-purchase-bonuses/${id}/`),

  update: (id: number, data: UpdateBonusSettingsRequest) =>
    apiClient.put<FirstPurchaseBonusSettings>(`api/admin/first-purchase-bonuses/${id}/`, data),

  patch: (id: number, data: UpdateBonusSettingsRequest) =>
    apiClient.patch<FirstPurchaseBonusSettings>(`api/admin/first-purchase-bonuses/${id}/`, data),
};
