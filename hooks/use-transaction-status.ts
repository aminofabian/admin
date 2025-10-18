import { useState, useEffect } from 'react';
import { transactionsApi } from '@/lib/api';
import type { Transaction, PaginatedResponse } from '@/types';

interface TransactionStatusData {
  pendingCount: number;
  totalToday: number;
  successRate: number;
  status: string;
  isLoading: boolean;
  error: string | null;
}

export function useTransactionStatus() {
  const [data, setData] = useState<TransactionStatusData>({
    pendingCount: 0,
    totalToday: 0,
    successRate: 0,
    status: 'Loading...',
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchTransactionStatus = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        // Fetch pending transactions (type=processing)
        const pendingResponse: PaginatedResponse<Transaction> = await transactionsApi.list({
          type: 'processing',
          page_size: 1000, // Get all pending transactions
        });

        const pendingCount = pendingResponse.count;

        // Fetch all transactions to calculate today's total and success rate
        const allTransactionsResponse: PaginatedResponse<Transaction> = await transactionsApi.list({
          page_size: 1000, // Get all transactions for calculations
        });

        const allTransactions = allTransactionsResponse.results;

        // Filter transactions for today
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = allTransactions.filter(txn => 
          txn.created.startsWith(today)
        );

        const totalToday = todayTransactions.length;

        // Calculate success rate from today's transactions
        const completedToday = todayTransactions.filter(txn => txn.status === 'completed').length;
        const successRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

        // Determine status based on pending count and success rate
        let status = 'Processing Smoothly';
        if (pendingCount > 50) {
          status = 'High Load';
        } else if (pendingCount > 20) {
          status = 'Moderate Load';
        } else if (successRate < 90) {
          status = 'Issues Detected';
        }

        setData({
          pendingCount,
          totalToday,
          successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal place
          status,
          isLoading: false,
          error: null,
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
        
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    };

    fetchTransactionStatus();
  }, []);

  return data;
}
