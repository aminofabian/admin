import { apiClient } from './client';
import type { 
  Company, 
  CreateCompanyRequest, 
  UpdateCompanyRequest,
  PaginatedResponse 
} from '@/types';

interface CompanyFilters {
  search?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

// Helper to normalize company payloads for create vs update
type CleanableFields = {
  game_api_url?: string;
  game_api_key?: string;
  service_creds?: string;
  btcpay_api_key?: string;
  btcpay_store_id?: string;
  btcpay_webhook_secret?: string;
  binpay_api_key?: string;
  binpay_secret_key?: string;
  binpay_deposit_secret_key?: string;
  binpay_withdrawal_secret_key?: string;
  binpay_kyc_webhook_secret?: string;
  tierlock_merchant_id?: string;
  tierlock_merchant_secret?: string;
  tierlock_deposit_secret?: string;
  tierlock_withdrawal_secret?: string;
  tierlock_payout_shared_secret?: string;
  tierlock_payout_client_secret?: string;
  taparcaida_vendor_id?: string;
  taparcaida_payout_api_key?: string;
  taparcaida_payout_api_secret?: string;
  meta_pixel_id?: string;
  meta_capi_token?: string;
};

const cleanCompanyData = <T extends CreateCompanyRequest | UpdateCompanyRequest>(
  data: T,
  isCreate: boolean = false
): T => {
  const cleaned = { ...data } as T & CleanableFields;

  const optionalFields: (keyof CleanableFields)[] = [
    'game_api_url', 
    'game_api_key', 
    'service_creds',
    'btcpay_api_key',
    'btcpay_store_id',
    'btcpay_webhook_secret',
    'binpay_api_key',
    'binpay_secret_key',
    'binpay_deposit_secret_key',
    'binpay_withdrawal_secret_key',
    'binpay_kyc_webhook_secret',
    'tierlock_merchant_id',
    'tierlock_merchant_secret',
    'tierlock_deposit_secret',
    'tierlock_withdrawal_secret',
    'tierlock_payout_shared_secret',
    'tierlock_payout_client_secret',
    'taparcaida_vendor_id',
    'taparcaida_payout_api_key',
    'taparcaida_payout_api_secret',
    'meta_pixel_id',
    'meta_capi_token',
  ];
  // On create, omit empty optional strings so we do not send noisy blank fields.
  // On update/patch, keep '' so the backend can clear stored secrets and IDs.
  if (isCreate) {
    optionalFields.forEach(field => {
      if (field in cleaned && cleaned[field] === '') {
        delete cleaned[field];
      }
    });
    // These fields cause backend errors as they don't exist on the Users model
    // They may need to be set separately after company creation
    delete cleaned.game_api_url;
    delete cleaned.game_api_key;
  }
  
  return cleaned as T;
};

function unwrapCompany(response: unknown): Company {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid company response');
  }

  const obj = response as Record<string, unknown>;

  if (
    'data' in obj &&
    obj.data &&
    typeof obj.data === 'object' &&
    'id' in (obj.data as Record<string, unknown>)
  ) {
    return obj.data as Company;
  }

  if ('id' in obj && 'username' in obj) {
    return obj as unknown as Company;
  }

  throw new Error('Invalid company response');
}

export const companiesApi = {
  list: (filters?: CompanyFilters) => 
    apiClient.get<PaginatedResponse<Company>>('api/admin/companies', {
      params: filters,
    }),

  get: async (id: number) => {
    const response = await apiClient.get<unknown>(`api/admin/companies/${id}`);
    return unwrapCompany(response);
  },

  create: async (data: CreateCompanyRequest) => {
    const cleanedData = cleanCompanyData(data, true); // true = isCreate
    const response = await apiClient.post<unknown>('api/admin/companies', cleanedData);
    return unwrapCompany(response);
  },

  update: async (id: number, data: UpdateCompanyRequest) => {
    const cleanedData = cleanCompanyData(data);
    const response = await apiClient.put<unknown>(`api/admin/companies/${id}`, cleanedData);
    return unwrapCompany(response);
  },

  partialUpdate: async (id: number, data: Partial<UpdateCompanyRequest>) => {
    const cleanedData = cleanCompanyData(data as UpdateCompanyRequest);
    const response = await apiClient.patch<unknown>(`api/admin/companies/${id}`, cleanedData);
    return unwrapCompany(response);
  },
};

