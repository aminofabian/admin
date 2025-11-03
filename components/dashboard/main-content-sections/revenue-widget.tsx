'use client';

import { useMemo } from 'react';
import { useTransactionVolume } from '@/hooks/use-transaction-volume';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';
import { formatCurrency } from '@/lib/utils/formatters';

export function RevenueWidget() {
  const volumeData = useTransactionVolume();

  const isPositive = volumeData.netVolume >= 0;
  const percentage = useMemo(() => {
    if (!volumeData || volumeData.purchases <= 0) return 0;
    const pct = (volumeData.netVolume / volumeData.purchases) * 100;
    return Math.max(0, Math.min(100, Math.abs(pct)));
  }, [volumeData]);

  const compactNet = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(Math.abs(volumeData.netVolume || 0));
    } catch {
      return formatCurrency(Math.abs(volumeData.netVolume || 0));
    }
  }, [volumeData.netVolume]);

  if (volumeData.isLoading) {
    return (
      <div className="relative bg-card/95 backdrop-blur-sm p-3 sm:p-4 md:p-5 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">Transaction Volume Today</h3>
            </div>
            
            <div className="w-2 h-2 bg-primary animate-pulse shadow-lg shadow-primary/50 rounded-full flex-shrink-0" />
          </div>
          <LoadingState />
        </div>
      </div>
    );
  }

  if (volumeData.error) {
    return (
      <div className="relative bg-card/95 backdrop-blur-sm p-3 sm:p-4 md:p-5 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">Revenue Today</h3>
          </div>
          <ErrorState message={volumeData.error} />
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">Revenue Today</h3>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${
              isPositive ? 'bg-primary shadow-lg shadow-primary/50' : 'bg-red-400 shadow-lg shadow-red-400/50'
            }`} />
          </div>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Main Revenue Display */}
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-2 sm:mb-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center overflow-hidden group relative">
              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className={`text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 ${isPositive ? 'text-primary' : 'text-red-400'}`}>
              {`${isPositive ? '+' : '-'}${compactNet}`}
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-2 sm:mb-3">
              <span className="text-muted-foreground">Net flow</span>
              <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPositive ? 'text-primary' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="w-full bg-gradient-to-r from-muted/30 to-muted/50 h-2.5 sm:h-3 rounded-full mb-1.5 sm:mb-2 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}>
              <div 
                className={`h-2.5 sm:h-3 transition-all duration-500 ease-out rounded-full ${
                  isPositive 
                    ? 'bg-gradient-to-r from-primary to-primary/80 shadow-sm' 
                    : 'bg-gradient-to-r from-red-400 to-red-500/80 shadow-sm'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {Math.round(percentage)}% of total volume
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-2 sm:p-3 border border-border/30 overflow-hidden min-w-0">
              <div className="text-center min-w-0">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">Purchases</div>
                <div className="text-xs sm:text-sm font-bold text-primary truncate leading-tight" title={formatCurrency(volumeData.purchases)}>{formatCurrency(volumeData.purchases)}</div>
              </div>
            </div>
            
            <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-2 sm:p-3 border border-border/30 overflow-hidden min-w-0">
              <div className="text-center min-w-0">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">Cashouts</div>
                <div className="text-xs sm:text-sm font-bold text-red-400 truncate leading-tight" title={formatCurrency(volumeData.cashouts)}>{formatCurrency(volumeData.cashouts)}</div>
              </div>
            </div>
            
            <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-2 sm:p-3 border border-border/30 overflow-hidden min-w-0">
              <div className="text-center min-w-0">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">Completed</div>
                <div className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight" title={new Intl.NumberFormat('en-US', { notation: 'compact' }).format(volumeData.completedCount)}>
                  {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(volumeData.completedCount)}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground truncate">txns</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
