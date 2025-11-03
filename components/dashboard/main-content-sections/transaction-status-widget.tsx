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
      <div className="relative bg-card/95 backdrop-blur-sm p-3 sm:p-4 md:p-5 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">Transaction Status</h3>
          </div>
          <ErrorState message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-card/95 backdrop-blur-sm p-3 sm:p-4 md:p-5 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
      </div>
      
      <div className="relative">
        {/* Header with icon and status indicator */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">Transaction Status</h3>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${
              loading ? 'bg-primary animate-pulse shadow-lg shadow-primary/50' :
              error ? 'bg-red-500' : 'bg-primary shadow-lg shadow-primary/50'
            }`} />
          </div>
        </div>
        
        {loading ? (
          <LoadingState />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Main Status Display */}
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-2 sm:mb-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center overflow-hidden relative">
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div className="text-xl sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1">
                {compactPending}
              </div>
              <div className="text-xs sm:text-sm text-primary font-medium mb-0.5 sm:mb-1">
                {status}
              </div>
              <div className="text-xs text-muted-foreground">pending transactions</div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-2 sm:p-3 border border-border/30">
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Success Rate</div>
                  <div className="text-base sm:text-lg font-bold text-primary">{formatPercentage(successRate)}</div>
                </div>
              </div>
              
              <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-2 sm:p-3 border border-border/30">
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Total Today</div>
                  <div className="text-base sm:text-lg font-bold text-foreground">{compactTotalToday}</div>
                </div>
              </div>
            </div>

            {/* Success Rate Visualization */}
            <div className="bg-gradient-to-br from-muted/30 via-muted/10 to-transparent p-2 sm:p-3 border border-border/30">
              <div className="flex justify-center items-center gap-2 sm:gap-3" role="img" aria-label={`Success buckets ${successBuckets} of 10`}>
                <div className="flex space-x-0.5 sm:space-x-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-2.5 sm:w-2 sm:h-3 transition-all duration-200 ${
                        i < successBuckets 
                          ? 'bg-primary shadow-sm' 
                          : 'bg-muted/50'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{`${successBuckets}/10`}</span>
              </div>
              <div className="text-center mt-1.5 sm:mt-2">
                <div className="text-[10px] sm:text-xs text-muted-foreground">Success Rate Buckets</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
