import { useState, useEffect, useMemo, useCallback } from 'react';
import { transactionsApi } from '@/lib/api';
import type { Transaction, PaginatedResponse } from '@/types';

interface TransactionStatusData {
  pendingCount: number;
  totalToday: number;
  successRate: number;
  status: string;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useTransactionStatus() {
  const [data, setData] = useState<TransactionStatusData>({
    pendingCount: 0,
    totalToday: 0,
    successRate: 0,
    status: 'Loading...',
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  // Memoized function to get today's date in user's timezone
  const getTodayDate = useCallback(() => {
    const today = new Date();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayLocal = new Date(today.toLocaleDateString("en-US", {timeZone: userTimezone}));
    return todayLocal.toISOString().split('T')[0];
  }, []);

  // Memoized function to process transaction data
  const processTransactionData = useCallback((transactions: Transaction[], today: string) => {
    // Filter transactions for today using proper timezone handling
    const todayTransactions = transactions.filter(txn => {
      const txnDate = new Date(txn.created);
      const txnDateString = txnDate.toLocaleDateString("en-CA", {timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone});
      return txnDateString === today;
    });

    const totalToday = todayTransactions.length;
    const completedToday = todayTransactions.filter(txn => txn.status === 'completed').length;
    const successRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

    return { totalToday, successRate };
  }, []);

  // Memoized function to determine status
  const determineStatus = useCallback((pendingCount: number, successRate: number) => {
    if (pendingCount > 50) return 'High Load';
    if (pendingCount > 20) return 'Moderate Load';
    if (successRate < 90) return 'Issues Detected';
    return 'Processing Smoothly';
  }, []);

  const fetchTransactionStatus = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const today = getTodayDate();
      console.log('🔄 Fetching transaction status for:', today);

      // Fetch pending transactions with optimized parameters
      const pendingResponse: PaginatedResponse<Transaction> = await transactionsApi.list({
        type: 'processing',
        page_size: 500, // Reduced for better performance
      });

      const pendingCount = pendingResponse.count || 0;

      // Fetch transactions for today with date filtering
      const todayTransactionsResponse: PaginatedResponse<Transaction> = await transactionsApi.list({
        created__gte: `${today}T00:00:00Z`,
        created__lt: `${today}T23:59:59Z`,
        page_size: 1000,
        ordering: '-created',
      });

      const { totalToday, successRate } = processTransactionData(
        todayTransactionsResponse.results || [],
        today
      );

      const status = determineStatus(pendingCount, successRate);

      console.log('📊 Transaction status calculated:', {
        pendingCount,
        totalToday,
        successRate: Math.round(successRate * 10) / 10,
        status,
        totalResults: todayTransactionsResponse.results?.length || 0
      });

      setData({
        pendingCount,
        totalToday,
        successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal place
        status,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

    } catch (err: unknown) {
      let errorMessage = 'Failed to load transaction status';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need appropriate privileges to view transaction status.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      console.error('❌ Transaction status fetch failed:', err);

      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [getTodayDate, processTransactionData, determineStatus]);

  useEffect(() => {
    // Initial fetch only - no polling
    // Real-time updates should come from websocket, not polling
    fetchTransactionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  return data;
}
