'use client';

interface RevenueData {
  totalToday: number;
  performance: number;
  transactionsCompleted: number;
  isGrowing: boolean;
}

export function BatteryWidget() {
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
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
          <span className="text-2xl sm:text-3xl">💰</span>
        </div>
        
        <div className="text-2xl font-bold text-foreground mb-1">
          {formatCurrency(revenue.totalToday)}
        </div>
        
        <div className="text-sm text-muted-foreground mb-3">
          {revenue.performance}% of target {revenue.isGrowing ? '📈' : '📊'}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-2">
          <div 
            className="h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-300"
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
          <span className="text-green-500">{revenue.isGrowing ? 'Growing' : 'Stable'}</span>
        </div>
      </div>
    </div>
  );
}
