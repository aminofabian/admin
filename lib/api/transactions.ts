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

  handleGameAction: (data: GameActionRequest) => {
    // Backend might expect form data instead of JSON
    // If backend expects JSON, use: data
    // If backend expects form data, use: FormData
    const formData = new FormData();
    formData.append('txn_id', String(data.txn_id));
    formData.append('type', data.type);
    if (data.new_password) formData.append('new_password', data.new_password);
    if (data.new_balance) formData.append('new_balance', data.new_balance);

    return apiClient.post<GameActionResponse>(
      API_ENDPOINTS.TRANSACTIONS.HANDLE_GAME_ACTION,
      formData  // Try form data first; change to 'data' if backend expects JSON
    );
  },
};

