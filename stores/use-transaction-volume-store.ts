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

      // Get today's date in user's local timezone for accurate filtering
      const today = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const todayLocal = new Date(today.toLocaleDateString("en-US", {timeZone: userTimezone}));
      const todayString = todayLocal.toISOString().split('T')[0];

      console.log('🔍 Revenue calculation details:', {
        userTimezone,
        todayLocal: todayLocal.toISOString(),
        todayString,
        purchasesCount: purchasesResponse.results.length,
        cashoutsCount: cashoutsResponse.results.length
      });

      // Filter and calculate purchases with better date handling
      const todayPurchases = purchasesResponse.results
        .filter(txn => {
          if (txn.status !== 'completed') return false;

          // Parse the transaction date and compare with today in user's timezone
          const txnDate = new Date(txn.created);
          const txnDateString = txnDate.toLocaleDateString("en-CA", {timeZone: userTimezone}); // YYYY-MM-DD

          return txnDateString === todayString;
        })
        .reduce((sum, txn) => {
          const amount = parseFloat(txn.amount) || 0;
          return sum + amount;
        }, 0);

      // Filter and calculate cashouts with better date handling
      const todayCashouts = cashoutsResponse.results
        .filter(txn => {
          if (txn.status !== 'completed') return false;

          // Parse the transaction date and compare with today in user's timezone
          const txnDate = new Date(txn.created);
          const txnDateString = txnDate.toLocaleDateString("en-CA", {timeZone: userTimezone}); // YYYY-MM-DD

          return txnDateString === todayString;
        })
        .reduce((sum, txn) => {
          const amount = parseFloat(txn.amount) || 0;
          return sum + amount;
        }, 0);

      // Calculate net flow
      const netFlow = todayPurchases - todayCashouts;

      // Count completed transactions with proper timezone handling
      const completedPurchasesCount = purchasesResponse.results
        .filter(txn => {
          if (txn.status !== 'completed') return false;
          const txnDate = new Date(txn.created);
          const txnDateString = txnDate.toLocaleDateString("en-CA", {timeZone: userTimezone});
          return txnDateString === todayString;
        }).length;

      const completedCashoutsCount = cashoutsResponse.results
        .filter(txn => {
          if (txn.status !== 'completed') return false;
          const txnDate = new Date(txn.created);
          const txnDateString = txnDate.toLocaleDateString("en-CA", {timeZone: userTimezone});
          return txnDateString === todayString;
        }).length;

      const completedCount = completedPurchasesCount + completedCashoutsCount;

      console.log('💰 Revenue calculation completed:', {
        todayPurchases,
        todayCashouts,
        netFlow,
        completedPurchasesCount,
        completedCashoutsCount,
        completedCount
      });

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
