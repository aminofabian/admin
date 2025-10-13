'use client';

interface RevenueData {
  totalToday: number;
  performance: number;
  transactionsCompleted: number;
  isGrowing: boolean;
}

export function RevenueWidget() {
  const revenue: RevenueData = {
    totalToday: 45000,
    performance: 92,
    transactionsCompleted: 1847,
    isGrowing: true,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Revenue Today</h3>
      
      <div className="text-center mb-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="text-2xl font-bold text-foreground mb-1">
          {formatCurrency(revenue.totalToday)}
        </div>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
          <span>{revenue.performance}% of target</span>
          {revenue.isGrowing ? (
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-2">
          <div 
            className="h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300"
            style={{ width: `${revenue.performance}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Completed TX</span>
          <span className="text-foreground">{revenue.transactionsCompleted} txns</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Status</span>
          <span className="text-primary font-medium">{revenue.isGrowing ? 'Growing' : 'Stable'}</span>
        </div>
      </div>
    </div>
  );
}
