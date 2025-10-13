'use client';

interface TransactionVolumeData {
  purchases: number;
  cashouts: number;
  netVolume: number;
  completedCount: number;
}

export function RevenueWidget() {
  // Mock data for transaction volume
  const volumeData: TransactionVolumeData = {
    purchases: 45200,
    cashouts: 28900,
    netVolume: 16300,
    completedCount: 342,
  };

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

  return (
    <div className="bg-card dark:bg-gray-800 rounded-xl p-4 border border-border dark:border-gray-700">
      <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-4">Transaction Volume Today</h3>
      
      <div className="text-center mb-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className={`text-2xl font-bold mb-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {`${isPositive ? '+' : ''}${formatCurrency(volumeData.netVolume)}`}
        </div>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground dark:text-gray-400 mb-3">
          <span>Net flow</span>
          {isPositive ? (
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted dark:bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${isPositive ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
            style={{ width: `${Math.min(Math.abs(percentage), 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground dark:text-gray-400">Purchases</span>
          <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(volumeData.purchases)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground dark:text-gray-400">Cashouts</span>
          <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(volumeData.cashouts)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground dark:text-gray-400">Completed</span>
          <span className="text-foreground dark:text-gray-100">{volumeData.completedCount} txns</span>
        </div>
      </div>
    </div>
  );
}
