import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Transaction,
  TransactionQueue,
  TransactionFilters,
  QueueFilters,
  PaginatedResponse 
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
};

