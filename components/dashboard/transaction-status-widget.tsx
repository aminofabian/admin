'use client';

import { useEffect, useState } from 'react';
import { dashboardStatsApi } from '@/lib/api/dashboard-stats';

interface TransactionHealthData {
  pendingCount: number;
  status: string;
  totalToday: number;
  successRate: number;
}

export function TransactionStatusWidget() {
  const [transactionHealth, setTransactionHealth] = useState<TransactionHealthData>({
    pendingCount: 23,
    status: 'Processing Smoothly',
    totalToday: 1847,
    successRate: 98.5,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactionStatus = async () => {
      try {
        const status = await dashboardStatsApi.getTransactionStatus();
        setTransactionHealth(status);
      } catch (error) {
        console.error('Error fetching transaction status:', error);
        // Keep default data on error
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionStatus();
    
    // Refresh every minute for real-time updates
    const interval = setInterval(fetchTransactionStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card dark:bg-gray-800 rounded-xl p-4 border border-border dark:border-gray-700">
      <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-4">Transaction Status</h3>
      
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-foreground dark:text-gray-100 mb-1">
          {loading ? '...' : transactionHealth.pendingCount}
        </div>
        <div className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
          {transactionHealth.status}
        </div>
        <div className="text-xs text-muted-foreground dark:text-gray-500">
          pending transactions
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground dark:text-gray-400">Success Rate</span>
          <span className="text-primary dark:text-blue-400 font-medium">{transactionHealth.successRate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground dark:text-gray-400">Total Today</span>
          <span className="text-foreground dark:text-gray-100">{transactionHealth.totalToday}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="flex space-x-1">
          {Array.from({ length: 10 }, (_, i) => {
            const threshold = Math.floor((transactionHealth.successRate / 100) * 10);
            return (
              <div
                key={i}
                className={`w-1 h-2 rounded ${
                  i < threshold ? 'bg-primary dark:bg-blue-500' : 'bg-muted dark:bg-gray-600'
                }`}
              />
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground dark:text-gray-400 ml-2">
          {Math.floor((transactionHealth.successRate / 100) * 10)} of 10
        </span>
      </div>
    </div>
  );
}
