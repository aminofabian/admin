'use client';

import { useMemo } from 'react';
import { useTransactionStatus } from '@/hooks/use-transaction-status';
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
      <div className="relative bg-card/95 backdrop-blur-sm p-5 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-foreground">Transaction Status</h3>
          </div>
          <ErrorState message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-card/95 backdrop-blur-sm p-5 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
      </div>
      
      <div className="relative">
        {/* Header with icon and status indicator */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-foreground">Transaction Status</h3>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              loading ? 'bg-primary animate-pulse shadow-lg shadow-primary/50' :
              error ? 'bg-red-500' : 'bg-primary shadow-lg shadow-primary/50'
            }`} />
          </div>
        </div>
        
        {loading ? (
          <LoadingState />
        ) : (
          <div className="space-y-4">
            {/* Main Status Display */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center overflow-hidden">
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div className="text-2xl font-bold text-foreground mb-1">
                {compactPending}
              </div>
              <div className="text-sm text-primary font-medium mb-1">
                {status}
              </div>
              <div className="text-xs text-muted-foreground">pending transactions</div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-3 border border-border/30">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                  <div className="text-lg font-bold text-primary">{formatPercentage(successRate)}</div>
                </div>
              </div>
              
              <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-3 border border-border/30">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total Today</div>
                  <div className="text-lg font-bold text-foreground">{compactTotalToday}</div>
                </div>
              </div>
            </div>

            {/* Success Rate Visualization */}
            <div className="bg-gradient-to-br from-muted/30 via-muted/10 to-transparent p-3 border border-border/30">
              <div className="flex justify-center items-center gap-3" role="img" aria-label={`Success buckets ${successBuckets} of 10`}>
                <div className="flex space-x-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-3 transition-all duration-200 ${
                        i < successBuckets 
                          ? 'bg-primary shadow-sm' 
                          : 'bg-muted/50'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium">{`${successBuckets}/10`}</span>
              </div>
              <div className="text-center mt-2">
                <div className="text-xs text-muted-foreground">Success Rate Buckets</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
