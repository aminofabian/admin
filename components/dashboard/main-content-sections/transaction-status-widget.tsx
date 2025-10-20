'use client';

import { useMemo } from 'react';
import { useTransactionStatus } from '@/hooks/use-transaction-status';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ErrorState } from '@/components/features/error-state';
import { LoadingState } from '@/components/features/loading-state';
import { formatPercentage } from '@/lib/utils/formatters';

export function TransactionStatusWidget() {
  const { 
    pendingCount, 
    status, 
    totalToday, 
    successRate, 
    isLoading: loading, 
    error 
  } = useTransactionStatus();

  const compactTotalToday = useMemo(() => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(totalToday || 0), [totalToday]);
  const compactPending = useMemo(() => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(pendingCount || 0), [pendingCount]);
  const successBuckets = useMemo(() => Math.floor((successRate / 100) * 10), [successRate]);

  // Show error state if there's an error
  if (error) {
    return (
      <Card className="rounded-xl border border-border">
        <CardHeader className="px-4 py-3">
          <h3 className="text-sm font-medium text-muted-foreground">Transaction Status</h3>
        </CardHeader>
        <CardContent className="px-4 py-6">
          <ErrorState message={error} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="px-4 py-3">
        <h3 className="text-sm font-medium text-muted-foreground">Transaction Status</h3>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <LoadingState />
        ) : (
          <div>
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-foreground mb-1">
                {compactPending}
              </div>
              <div className="text-sm text-muted-foreground mb-1">
                {status}
              </div>
              <div className="text-xs text-muted-foreground">pending transactions</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="text-primary font-medium">{formatPercentage(successRate)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Today</span>
                <span className="text-foreground font-medium">{compactTotalToday}</span>
              </div>
            </div>

            <div className="mt-4 flex justify-center items-center gap-2" role="img" aria-label={`Success buckets ${successBuckets} of 10`}>
              <div className="flex space-x-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-2 rounded ${i < successBuckets ? 'bg-primary' : 'bg-muted'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{`${successBuckets}/10`}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
