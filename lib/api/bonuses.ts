import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  PurchaseBonus,
  RechargeBonus,
  TransferBonus,
  SignupBonus,
  CreatePurchaseBonusRequest,
  UpdateBonusRequest,
  UpdatePurchaseBonusRequest,
  PaginatedResponse 
} from '@/types';
import type { AffiliateDefaults, UpdateAffiliateDefaultsRequest } from '@/types/affiliate';

export const bonusesApi = {
  purchase: {
    list: () => 
      apiClient.get<PaginatedResponse<PurchaseBonus>>(API_ENDPOINTS.BONUSES.PURCHASE),

    create: (data: CreatePurchaseBonusRequest) => 
      apiClient.post<PurchaseBonus>(API_ENDPOINTS.BONUSES.PURCHASE, data),

    update: (id: number, data: UpdatePurchaseBonusRequest) => 
      apiClient.patch<PurchaseBonus>(`${API_ENDPOINTS.BONUSES.PURCHASE}${id}/`, data),

    delete: (id: number) =>
      apiClient.delete<void>(`${API_ENDPOINTS.BONUSES.PURCHASE}${id}/`),
  },

  recharge: {
    list: () => 
      apiClient.get<PaginatedResponse<RechargeBonus>>(API_ENDPOINTS.BONUSES.RECHARGE),

    get: (id: number) =>
      apiClient.get<RechargeBonus>(`${API_ENDPOINTS.BONUSES.RECHARGE}${id}/`),

    update: (id: number, data: UpdateBonusRequest) => 
      apiClient.patch<RechargeBonus>(`${API_ENDPOINTS.BONUSES.RECHARGE}${id}/`, data),
  },

  transfer: {
    list: () => 
      apiClient.get<PaginatedResponse<TransferBonus>>(API_ENDPOINTS.BONUSES.TRANSFER),

    get: (id: number) =>
      apiClient.get<TransferBonus>(`${API_ENDPOINTS.BONUSES.TRANSFER}${id}/`),

    update: (id: number, data: UpdateBonusRequest) => 
      apiClient.patch<TransferBonus>(`${API_ENDPOINTS.BONUSES.TRANSFER}${id}/`, data),
  },

  signup: {
    list: () => 
      apiClient.get<PaginatedResponse<SignupBonus>>(API_ENDPOINTS.BONUSES.SIGNUP),

    get: (id: number) =>
      apiClient.get<SignupBonus>(`${API_ENDPOINTS.BONUSES.SIGNUP}${id}/`),

    update: (id: number, data: UpdateBonusRequest) => 
      apiClient.patch<SignupBonus>(`${API_ENDPOINTS.BONUSES.SIGNUP}${id}/`, data),
  },

  affiliateDefaults: {
    list: () =>
      apiClient.get<PaginatedResponse<AffiliateDefaults>>(API_ENDPOINTS.AFFILIATES.DEFAULTS),

    get: (id: number) =>
      apiClient.get<AffiliateDefaults>(`${API_ENDPOINTS.AFFILIATES.DEFAULTS}${id}/`),

    update: (id: number, data: UpdateAffiliateDefaultsRequest) =>
      apiClient.patch<AffiliateDefaults>(`${API_ENDPOINTS.AFFILIATES.DEFAULTS}${id}/`, data),
  },
};

