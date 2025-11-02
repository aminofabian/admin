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

export const transactionsApi = {
  list: (filters?: TransactionFilters) => 
    apiClient.get<PaginatedResponse<Transaction>>(
      API_ENDPOINTS.TRANSACTIONS.LIST, 
      { params: filters }
    ),

  queues: (filters?: QueueFilters) => 
    apiClient.get<PaginatedResponse<TransactionQueue>>(
      API_ENDPOINTS.TRANSACTIONS.QUEUES, 
      { params: filters }
    ),

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
    if (data.new_password) formData.append('new_password', data.new_password);
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

