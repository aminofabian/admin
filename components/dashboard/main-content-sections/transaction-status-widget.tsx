'use client';

interface TransactionHealthData {
  pendingCount: number;
  status: string;
  totalToday: number;
  successRate: number;
}

export function TransactionStatusWidget() {
  const transactionHealth: TransactionHealthData = {
    pendingCount: 23,
    status: 'Processing Smoothly',
    totalToday: 1847,
    successRate: 98.5,
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Transaction Status</h3>
      
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-foreground mb-1">
          {transactionHealth.pendingCount}
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          {transactionHealth.status}
        </div>
        <div className="text-xs text-muted-foreground">
          pending transactions
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Success Rate</span>
          <span className="text-primary font-medium">{transactionHealth.successRate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Today</span>
          <span className="text-foreground font-medium">{transactionHealth.totalToday}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-center items-center gap-2">
        <div className="flex space-x-1">
          {Array.from({ length: 10 }, (_, i) => {
            const threshold = Math.floor((transactionHealth.successRate / 100) * 10);
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
          {Math.floor((transactionHealth.successRate / 100) * 10)}/10
        </span>
      </div>
    </div>
  );
}
