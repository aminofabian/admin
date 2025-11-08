import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type {
  PaymentMethod,
  PaymentMethodsListResponse,
  UpdatePaymentMethodRequest,
} from '@/types';

export const paymentMethodsApi = {
  list: () => {
    return apiClient.get<PaymentMethodsListResponse>(API_ENDPOINTS.PAYMENT_METHODS.LIST);
  },

  get: (id: number) =>
    apiClient.get<PaymentMethod>(API_ENDPOINTS.PAYMENT_METHODS.DETAIL(id)),

  update: (id: number, data: UpdatePaymentMethodRequest) =>
    apiClient.put<PaymentMethod>(API_ENDPOINTS.PAYMENT_METHODS.DETAIL(id), data),

  patch: (id: number, data: UpdatePaymentMethodRequest) =>
    apiClient.patch<PaymentMethod>(API_ENDPOINTS.PAYMENT_METHODS.DETAIL(id), data),
};

