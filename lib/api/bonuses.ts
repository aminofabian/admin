import { apiClient } from './client';
import type { 
  PurchaseBonus,
  RechargeBonus,
  TransferBonus,
  SignupBonus,
  FirstPurchaseBonus,
  CreatePurchaseBonusRequest,
  UpdateBonusRequest,
  UpdatePurchaseBonusRequest,
  PaginatedResponse 
} from '@/types';
import type { AffiliateDefaults, UpdateAffiliateDefaultsRequest } from '@/types/affiliate';

export const bonusesApi = {
  purchase: {
    list: () =>
      apiClient.get<PaginatedResponse<PurchaseBonus>>('api/admin/purchase-bonuses'),

    create: (data: CreatePurchaseBonusRequest) =>
      apiClient.post<PurchaseBonus>('api/admin/purchase-bonuses', data),

    update: (id: number, data: UpdatePurchaseBonusRequest) =>
      apiClient.patch<PurchaseBonus>(`api/admin/purchase-bonuses/${id}/`, data),

    delete: (id: number) =>
      apiClient.delete<void>(`api/admin/purchase-bonuses/${id}/`),
  },

  recharge: {
    list: () =>
      apiClient.get<PaginatedResponse<RechargeBonus>>('api/admin/recharge-bonuses'),

    get: (id: number) =>
      apiClient.get<RechargeBonus>(`api/admin/recharge-bonuses/${id}/`),

    update: (id: number, data: UpdateBonusRequest) =>
      apiClient.patch<RechargeBonus>(`api/admin/recharge-bonuses/${id}/`, data),
  },

  transfer: {
    list: () =>
      apiClient.get<PaginatedResponse<TransferBonus>>('api/admin/transfer-bonuses'),

    get: (id: number) =>
      apiClient.get<TransferBonus>(`api/admin/transfer-bonuses/${id}/`),

    update: (id: number, data: UpdateBonusRequest) =>
      apiClient.patch<TransferBonus>(`api/admin/transfer-bonuses/${id}/`, data),
  },

  signup: {
    list: () =>
      apiClient.get<PaginatedResponse<SignupBonus>>('api/admin/signup-bonuses'),

    get: (id: number) =>
      apiClient.get<SignupBonus>(`api/admin/signup-bonuses/${id}/`),

    update: (id: number, data: UpdateBonusRequest) =>
      apiClient.patch<SignupBonus>(`api/admin/signup-bonuses/${id}/`, data),
  },

  firstPurchase: {
    list: () =>
      apiClient.get<PaginatedResponse<FirstPurchaseBonus>>('api/admin/first-purchase-bonuses'),

    get: (id: number) =>
      apiClient.get<FirstPurchaseBonus>(`api/admin/first-purchase-bonuses/${id}/`),

    update: (id: number, data: UpdateBonusRequest) =>
      apiClient.patch<FirstPurchaseBonus>(`api/admin/first-purchase-bonuses/${id}/`, data),
  },

  affiliateDefaults: {
    list: () =>
      apiClient.get<PaginatedResponse<AffiliateDefaults>>('api/admin/affiliate-defaults'),

    get: (id: number) =>
      apiClient.get<AffiliateDefaults>(`api/admin/affiliate-defaults/${id}/`),

    update: (id: number, data: UpdateAffiliateDefaultsRequest) =>
      apiClient.patch<AffiliateDefaults>(`api/admin/affiliate-defaults/${id}/`, data),
  },
};

