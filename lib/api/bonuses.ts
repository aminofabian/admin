import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  PurchaseBonus,
  RechargeBonus,
  TransferBonus,
  SignupBonus,
  CreatePurchaseBonusRequest,
  UpdateBonusRequest,
  PaginatedResponse 
} from '@/types';

export const bonusesApi = {
  purchase: {
    list: () => 
      apiClient.get<PaginatedResponse<PurchaseBonus>>(API_ENDPOINTS.BONUSES.PURCHASE),

    create: (data: CreatePurchaseBonusRequest) => 
      apiClient.post<PurchaseBonus>(API_ENDPOINTS.BONUSES.PURCHASE, data),
  },

  recharge: {
    list: () => 
      apiClient.get<PaginatedResponse<RechargeBonus>>(API_ENDPOINTS.BONUSES.RECHARGE),

    update: (id: number, data: UpdateBonusRequest) => 
      apiClient.patch<RechargeBonus>(`${API_ENDPOINTS.BONUSES.RECHARGE}${id}/`, data),
  },

  transfer: {
    list: () => 
      apiClient.get<PaginatedResponse<TransferBonus>>(API_ENDPOINTS.BONUSES.TRANSFER),

    update: (id: number, data: UpdateBonusRequest) => 
      apiClient.patch<TransferBonus>(`${API_ENDPOINTS.BONUSES.TRANSFER}${id}/`, data),
  },

  signup: {
    list: () => 
      apiClient.get<PaginatedResponse<SignupBonus>>(API_ENDPOINTS.BONUSES.SIGNUP),

    update: (id: number, data: UpdateBonusRequest) => 
      apiClient.patch<SignupBonus>(`${API_ENDPOINTS.BONUSES.SIGNUP}${id}/`, data),
  },
};

