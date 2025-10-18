'use client';

import { useTransactionStatus } from '@/hooks/use-transaction-status';

export function TransactionStatusWidget() {
  const { 
    pendingCount, 
    status, 
    totalToday, 
    successRate, 
    isLoading: loading, 
    error 
  } = useTransactionStatus();

  // Show error state if there's an error
  if (error) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Transaction Status</h3>
        <div className="text-center py-8">
          <div className="text-destructive text-sm mb-2">⚠️ Error Loading Data</div>
          <div className="text-xs text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Transaction Status</h3>
      
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-foreground mb-1">
          {loading ? '...' : pendingCount}
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          {loading ? 'Loading...' : status}
        </div>
        <div className="text-xs text-muted-foreground">
          pending transactions
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Success Rate</span>
          <span className="text-primary font-medium">
            {loading ? '...' : `${successRate}%`}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Today</span>
          <span className="text-foreground font-medium">
            {loading ? '...' : totalToday.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-center items-center gap-2">
        <div className="flex space-x-1">
          {Array.from({ length: 10 }, (_, i) => {
            const threshold = loading ? 0 : Math.floor((successRate / 100) * 10);
            return (
              <div
                key={i}
                className={`w-1 h-2 rounded ${
                  i < threshold ? 'bg-primary' : 'bg-muted'
                }`}
              />
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          {loading ? '...' : `${Math.floor((successRate / 100) * 10)}/10`}
        </span>
      </div>
    </div>
  );
}
