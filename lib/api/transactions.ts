import { apiClient } from './client';
import type { 
  Transaction,
  TransactionQueue,
  TransactionFilters,
  QueueFilters,
  PaginatedResponse,
  GameActionRequest,
  GameActionResponse
} from '@/types';

/** Extra fields forwarded to Django for BinPay/Tierlock/Taparcadia (backend must read these). */
export type TransactionActionOptions = {
  playerIp?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  /** BinPay `username`: valid email or 10-digit phone. */
  binpayUsername?: string | null;
  /** Hint Tierlock to use email for payout contact (no phone). */
  tierlockPreferEmailOnly?: boolean;
};

function normalizePaginatedBody<T>(body: Record<string, unknown>): PaginatedResponse<T> {
  const results = Array.isArray(body.results) ? (body.results as T[]) : [];
  const rawCount = body.count;
  const count =
    typeof rawCount === 'number'
      ? rawCount
      : typeof rawCount === 'string'
        ? Number.parseInt(rawCount, 10)
        : Number.NaN;
  const safeCount = Number.isFinite(count) ? count : results.length;
  return {
    count: safeCount,
    next: (body.next as string | null | undefined) ?? null,
    previous: (body.previous as string | null | undefined) ?? null,
    results,
  };
}

/**
 * Normalizes transaction list response to ensure it matches PaginatedResponse format.
 * Backend sometimes returns plain arrays instead of paginated responses.
 */
async function normalizePaginatedResponse<T>(
  promise: Promise<PaginatedResponse<T> | T[]>
): Promise<PaginatedResponse<T>> {
  const response = await promise;
  
  // If response is already paginated (has 'results' property), return as-is
  if (response && typeof response === 'object' && 'results' in response) {
    return normalizePaginatedBody<T>(response as Record<string, unknown>);
  }
  
  // If response is a plain array, wrap it in paginated structure
  if (Array.isArray(response)) {
    console.warn('⚠️ Backend returned plain array instead of paginated response. Normalizing...');
    return {
      count: response.length,
      next: null,
      previous: null,
      results: response,
    };
  }
  
  // Fallback for unexpected response format
  console.error('❌ Unexpected response format:', response);
  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
}

export const transactionsApi = {
  list: async (filters?: TransactionFilters) => {
    // Log filters before sending (especially username/email for partial search)
    if (filters?.username || filters?.email || filters?.agent || filters?.agent_id) {
      console.log('📤 Sending to transactionsApi.list:', {
        endpoint: 'api/admin/transactions',
        filters,
        username: filters.username,
        email: filters.email,
        agent: filters.agent,
        agent_id: filters.agent_id,
      });
    }
    
    const response = apiClient.get<PaginatedResponse<Transaction> | Transaction[]>(
      'api/admin/transactions', 
      { params: filters }
    );
    
    const result = await normalizePaginatedResponse(response);
    
    // Log result for username/email/agent filters
    if (filters?.username || filters?.email || filters?.agent || filters?.agent_id) {
      console.log('📥 Received from transactionsApi.list:', {
        count: result.count,
        resultsLength: result.results.length,
        hasResults: result.results.length > 0,
        searchedUsername: filters.username,
        searchedEmail: filters.email,
      });
    }
    
    return result;
  },

  queues: async (filters?: QueueFilters) => {
    const response = apiClient.get<PaginatedResponse<TransactionQueue> | TransactionQueue[]>(
      'api/admin/transaction-queues', 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  // New separate endpoints for history and processing
  listHistory: async (filters?: Omit<TransactionFilters, 'type'>) => {
    const response = apiClient.get<PaginatedResponse<Transaction> | Transaction[]>(
      'api/admin/transactions-history', 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  listPurchases: async (filters?: Omit<TransactionFilters, 'type' | 'txn' | 'txn_type'>) => {
    const response = apiClient.get<PaginatedResponse<Transaction> | Transaction[]>(
      'api/admin/transaction-purchases', 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  listCashouts: async (filters?: Omit<TransactionFilters, 'type' | 'txn' | 'txn_type'>) => {
    const response = apiClient.get<PaginatedResponse<Transaction> | Transaction[]>(
      'api/admin/transaction-cashouts', 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  queuesHistory: async (filters?: QueueFilters) => {
    const response = apiClient.get<PaginatedResponse<TransactionQueue> | TransactionQueue[]>(
      'api/admin/transaction-queues-history', 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  queuesProcessing: async (filters?: QueueFilters) => {
    const response = apiClient.get<PaginatedResponse<TransactionQueue> | TransactionQueue[]>(
      'api/admin/transaction-queues-processing', 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  updateStatus: (id: string, payload: { status: string }) =>
    apiClient.patch<Transaction>(
      `api/admin/transactions/${id}/`,
      payload
    ),

  handleGameAction: async (data: GameActionRequest) => {
    // Create URL-encoded form data for the request
    const formData = new FormData();
    formData.append('txn_id', String(data.txn_id));
    formData.append('type', data.type);
    
    // For add_user_game and create_game types, use game_username and game_password
    // For other types, use new_username and new_password
    if (data.game_username) {
      formData.append('game_username', data.game_username);
    } else if (data.new_username) {
      formData.append('new_username', data.new_username);
    }
    
    if (data.game_password) {
      formData.append('game_password', data.game_password);
    } else if (data.new_password) {
      formData.append('new_password', data.new_password);
    }
    
    if (data.new_balance) formData.append('new_balance', data.new_balance);

    // Use the Next.js API proxy route to avoid CORS issues
    // The proxy route will forward the request to the Django backend
    // Note: The proxy expects FormData and converts it to URLSearchParams
    const response = await apiClient.post<GameActionResponse>(
      'api/handle-game-action',
      formData
    );
    
    // Check if the response contains an error (backend errors return 200 with error in body)
    if (response.status === 'error') {
      throw {
        status: 'error',
        message: response.message || 'Failed to process game action',
      };
    }
    
    return response;
  },

  transactionAction: async (
    txnId: string,
    type: 'cancel' | 'complete' | 'send_to_binpay' | 'send_to_tierlock' | 'send_to_taparcadia',
    options?: TransactionActionOptions
  ) => {
    const formData = new FormData();
    formData.append('txn_id', txnId);
    formData.append('type', type);
    if (options?.playerIp) {
      formData.append('player_ip', options.playerIp);
    }
    if (options?.userEmail) {
      const e = options.userEmail.trim();
      formData.append('user_email', e);
      formData.append('player_email', e);
      formData.append('email', e);
    }
    if (options?.userPhone) {
      const p = options.userPhone.trim();
      formData.append('user_phone', p);
      formData.append('phone', p);
      formData.append('phone_number', p);
    }
    if (options?.binpayUsername) {
      formData.append('binpay_username', options.binpayUsername.trim());
    }
    if (options?.tierlockPreferEmailOnly) {
      formData.append('tierlock_prefer_email', '1');
      if (options.userEmail) {
        formData.append('tierlock_contact_email', options.userEmail.trim());
      }
    }

    const response = await apiClient.post<{ status: string; message: string; kyc_link?: string }>(
      'api/transaction-action',
      formData
    );
    
    // Check if the response contains an error (backend errors return 200 with error in body)
    if (response.status === 'error') {
      throw {
        status: 'error',
        message: response.message || 'Failed to process transaction action',
        kyc_link: response.kyc_link,
      };
    }
    
    return response;
  },
};

