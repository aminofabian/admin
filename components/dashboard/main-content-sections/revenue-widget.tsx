'use client';

import { useTransactionVolume } from '@/hooks/use-transaction-volume';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';

export function RevenueWidget() {
  const volumeData = useTransactionVolume();

  const isPositive = volumeData.netVolume >= 0;
  const percentage = volumeData.purchases > 0 
    ? (volumeData.netVolume / volumeData.purchases) * 100 
    : 0;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  if (volumeData.isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Transaction Volume Today</h3>
        <LoadingState />
      </div>
    );
  }

  if (volumeData.error) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Transaction Volume Today</h3>
        <ErrorState message={volumeData.error} />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Transaction Volume Today</h3>
      
      <div className="text-center mb-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className={`text-2xl font-bold mb-1 ${isPositive ? 'text-primary' : 'text-muted-foreground'}`}>
          {`${isPositive ? '+' : ''}${formatCurrency(volumeData.netVolume)}`}
        </div>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
          <span>Net flow</span>
          <svg className={`w-4 h-4 ${isPositive ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
          </svg>
        </div>

        <div className="w-full bg-muted/50 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${isPositive ? 'bg-primary' : 'bg-muted-foreground/50'}`}
            style={{ width: `${Math.min(Math.abs(percentage), 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Purchases</span>
          <span className="text-foreground font-medium">{formatCurrency(volumeData.purchases)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Cashouts</span>
          <span className="text-foreground font-medium">{formatCurrency(volumeData.cashouts)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Completed</span>
          <span className="text-foreground font-medium">{volumeData.completedCount} txns</span>
        </div>
      </div>
    </div>
  );
}
