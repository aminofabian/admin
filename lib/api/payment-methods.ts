import { apiClient } from './client';
import type {
  PaymentMethod,
  PaymentMethodsListResponse,
  UpdatePaymentMethodRequest,
} from '@/types';
import type { Company } from '@/types';

interface PaymentMethodManagementResponse {
  status: string;
  role?: string;
  companies: Company[];
  selected_company?: Company;
  company_payment_methods: PaymentMethod[];
}

interface ToggleCashoutRequest {
  type: 'toggle_cashout_by_superadmin';
  payment_method_id: number;
}

interface TogglePurchaseRequest {
  type: 'toggle_purchase_by_superadmin';
  payment_method_id: number;
}

interface EnableAllPurchaseRequest {
  type: 'enable_all_purchase';
  company_id: number;
}

interface EnableAllCashoutRequest {
  type: 'enable_all_cashout';
  company_id: number;
}

interface DisableAllPurchaseRequest {
  type: 'disable_all_purchase';
  company_id: number;
}

interface DisableAllCashoutRequest {
  type: 'disable_all_cashout';
  company_id: number;
}

export const paymentMethodsApi = {
  list: () => {
    return apiClient.get<PaymentMethodsListResponse>('api/admin/payment-methods');
  },

  get: (id: number) =>
    apiClient.get<PaymentMethod>(`api/admin/payment-methods/${id}`),

  update: (id: number, data: UpdatePaymentMethodRequest) =>
    apiClient.put<PaymentMethod>(`api/admin/payment-methods/${id}`, data),

  patch: (id: number, data: UpdatePaymentMethodRequest) =>
    apiClient.patch<PaymentMethod>(`api/admin/payment-methods/${id}`, data),

  // Payment Methods Management (Superadmin)
  getManagementCompanies: () =>
    apiClient.get<PaymentMethodManagementResponse>('api/admin/payment-methods-management'),

  getManagementCompanyPaymentMethods: (companyId: number) =>
    apiClient.get<PaymentMethodManagementResponse>('api/admin/payment-methods-management', {
      params: { company_id: companyId },
    }),

  toggleCashout: (paymentMethodId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/payment-methods-management',
      { type: 'toggle_cashout_by_superadmin', payment_method_id: paymentMethodId } as ToggleCashoutRequest
    ),

  togglePurchase: (paymentMethodId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/payment-methods-management',
      { type: 'toggle_purchase_by_superadmin', payment_method_id: paymentMethodId } as TogglePurchaseRequest
    ),

  enableAllPurchase: (companyId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/payment-methods-management',
      { type: 'enable_all_purchase', company_id: companyId } as EnableAllPurchaseRequest
    ),

  enableAllCashout: (companyId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/payment-methods-management',
      { type: 'enable_all_cashout', company_id: companyId } as EnableAllCashoutRequest
    ),

  disableAllPurchase: (companyId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/payment-methods-management',
      { type: 'disable_all_purchase', company_id: companyId } as DisableAllPurchaseRequest
    ),

  disableAllCashout: (companyId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/payment-methods-management',
      { type: 'disable_all_cashout', company_id: companyId } as DisableAllCashoutRequest
    ),
};

