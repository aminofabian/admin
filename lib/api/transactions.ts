import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Transaction,
  TransactionQueue,
  TransactionFilters,
  QueueFilters,
  PaginatedResponse,
  GameActionRequest,
  GameActionResponse
} from '@/types';

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
    return response as PaginatedResponse<T>;
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
        endpoint: API_ENDPOINTS.TRANSACTIONS.LIST,
        filters,
        username: filters.username,
        email: filters.email,
        agent: filters.agent,
        agent_id: filters.agent_id,
      });
    }
    
    const response = apiClient.get<PaginatedResponse<Transaction> | Transaction[]>(
      API_ENDPOINTS.TRANSACTIONS.LIST, 
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
      API_ENDPOINTS.TRANSACTIONS.QUEUES, 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  // New separate endpoints for history and processing
  listHistory: async (filters?: Omit<TransactionFilters, 'type'>) => {
    const response = apiClient.get<PaginatedResponse<Transaction> | Transaction[]>(
      API_ENDPOINTS.TRANSACTIONS.HISTORY, 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  listPurchases: async (filters?: Omit<TransactionFilters, 'type' | 'txn' | 'txn_type'>) => {
    const response = apiClient.get<PaginatedResponse<Transaction> | Transaction[]>(
      API_ENDPOINTS.TRANSACTIONS.PURCHASES, 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  listCashouts: async (filters?: Omit<TransactionFilters, 'type' | 'txn' | 'txn_type'>) => {
    const response = apiClient.get<PaginatedResponse<Transaction> | Transaction[]>(
      API_ENDPOINTS.TRANSACTIONS.CASHOUTS, 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  queuesHistory: async (filters?: Omit<QueueFilters, 'type'>) => {
    const response = apiClient.get<PaginatedResponse<TransactionQueue> | TransactionQueue[]>(
      API_ENDPOINTS.TRANSACTIONS.QUEUES_HISTORY, 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  queuesProcessing: async (filters?: Omit<QueueFilters, 'type'>) => {
    const response = apiClient.get<PaginatedResponse<TransactionQueue> | TransactionQueue[]>(
      API_ENDPOINTS.TRANSACTIONS.QUEUES_PROCESSING, 
      { params: filters }
    );
    return normalizePaginatedResponse(response);
  },

  updateStatus: (id: string, payload: { status: string }) =>
    apiClient.patch<Transaction>(
      API_ENDPOINTS.TRANSACTIONS.DETAIL(id),
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
      API_ENDPOINTS.TRANSACTIONS.HANDLE_GAME_ACTION,
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

  transactionAction: async (txnId: string, type: 'cancel' | 'complete') => {
    // Create form-data for the transaction action request
    const formData = new FormData();
    formData.append('txn_id', txnId);
    formData.append('type', type);

    const response = await apiClient.post<{ status: string; message: string }>(
      API_ENDPOINTS.TRANSACTIONS.ACTION,
      formData
    );
    
    // Check if the response contains an error (backend errors return 200 with error in body)
    if (response.status === 'error') {
      throw {
        status: 'error',
        message: response.message || 'Failed to process transaction action',
      };
    }
    
    return response;
  },
};

