'use client';

import { useDashboardStats } from '@/hooks/use-dashboard-stats';

interface PlatformBalanceData {
  totalBalance?: number;
  winningBalance?: number;
  totalPlayers?: number;
}

export function JackpotPoolGauge(props: PlatformBalanceData = {}) {
  const { stats, loading } = useDashboardStats();
  
  // Use real data from API, fallback to props, then defaults
  const totalBalance = props.totalBalance ?? stats?.totalBalance ?? 0;
  const winningBalance = props.winningBalance ?? stats?.totalWinningBalance ?? 0;
  const totalPlayers = props.totalPlayers ?? stats?.totalPlayers ?? 0;

  const platformLiquidity = totalBalance + winningBalance;
  const balancePercentage = platformLiquidity > 0 ? (totalBalance / platformLiquidity) * 100 : 50;
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(balancePercentage / 100) * circumference} ${circumference}`;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Platform Liquidity</h3>
      
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
          <span className="text-lg font-bold text-foreground">
            {loading ? '...' : formatCurrency(platformLiquidity)}
          </span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Main Balance</span>
          <span className="text-foreground font-medium">{loading ? '...' : formatCurrency(totalBalance)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Winning Balance</span>
          <span className="text-foreground font-medium">{loading ? '...' : formatCurrency(winningBalance)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Players</span>
          <span className="text-primary font-medium">{loading ? '...' : totalPlayers.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
