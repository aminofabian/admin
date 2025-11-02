import { create } from 'zustand';
import { transactionsApi } from '@/lib/api';
import type { Transaction, PaginatedResponse } from '@/types';

interface TransactionVolumeData {
  purchases: number;
  cashouts: number;
  netVolume: number;
  completedCount: number;
}

interface TransactionVolumeState {
  data: TransactionVolumeData;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface TransactionVolumeActions {
  fetchTransactionVolume: () => Promise<void>;
  reset: () => void;
}

type TransactionVolumeStore = TransactionVolumeState & TransactionVolumeActions;

const initialData: TransactionVolumeData = {
  purchases: 0,
  cashouts: 0,
  netVolume: 0,
  completedCount: 0,
};

const initialState: TransactionVolumeState = {
  data: initialData,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useTransactionVolumeStore = create<TransactionVolumeStore>((set, get) => ({
  ...initialState,

  fetchTransactionVolume: async () => {
    set({ isLoading: true, error: null });

    try {
      // Fetch purchases today
      const purchasesResponse: PaginatedResponse<Transaction> = await transactionsApi.list({
        txn: 'purchases',
        page_size: 1000, // Get  for today
      });

      // Fetch cashouts today
      const cashoutsResponse: PaginatedResponse<Transaction> = await transactionsApi.list({
        txn: 'cashouts',
        page_size: 1000, // Get all cashouts for today
      });

      const today = new Date().toISOString().split('T')[0];
      
      // Filter and calculate purchases
      const todayPurchases = purchasesResponse.results
        .filter(txn => txn.created.startsWith(today) && txn.status === 'completed')
        .reduce((sum, txn) => sum + parseFloat(txn.amount), 0);

      // Filter and calculate cashouts
      const todayCashouts = cashoutsResponse.results
        .filter(txn => txn.created.startsWith(today) && txn.status === 'completed')
        .reduce((sum, txn) => sum + parseFloat(txn.amount), 0);

      // Calculate net flow
      const netFlow = todayPurchases - todayCashouts;

      // Count completed transactions
      const completedCount = purchasesResponse.results
        .filter(txn => txn.created.startsWith(today) && txn.status === 'completed').length +
        cashoutsResponse.results
        .filter(txn => txn.created.startsWith(today) && txn.status === 'completed').length;

      set({
        data: {
          purchases: todayPurchases,
          cashouts: todayCashouts,
          netVolume: netFlow,
          completedCount,
        },
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

    } catch (err: unknown) {
      let errorMessage = 'Failed to load transaction volume';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need appropriate privileges to view transaction volume.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
