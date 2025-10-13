'use client';

interface JackpotData {
  current: number;
  max: number;
  lastWin: number;
}

export function JackpotPoolGauge({ current = 45000, max = 100000, lastWin = 12500 }: JackpotData) {
  const percentage = (current / max) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Total Jackpot Pool</h3>
      
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            className="text-primary"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground">{formatCurrency(current)}</span>
          <span className="text-xs text-muted-foreground">pool</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Max Pool</span>
          <span className="text-foreground">{formatCurrency(max)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Last Win</span>
          <span className="text-foreground">{formatCurrency(lastWin)}</span>
        </div>
      </div>
    </div>
  );
}
