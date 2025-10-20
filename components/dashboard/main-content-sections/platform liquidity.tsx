'use client';

import { useMemo } from 'react';
import { usePlatformLiquidity } from '@/hooks/use-platform-liquidity';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ErrorState } from '@/components/features/error-state';
import { LoadingState } from '@/components/features/loading-state';
import { formatCurrency } from '@/lib/utils/formatters';

interface PlatformBalanceData {
  totalBalance?: number;
  winningBalance?: number;
  totalPlayers?: number;
}

export function JackpotPoolGauge(props: PlatformBalanceData = {}) {
  const { 
    totalMainBalance, 
    totalWinningBalance, 
    platformLiquidity, 
    totalPlayers, 
    isLoading: loading, 
    error 
  } = usePlatformLiquidity();
  
  // Use real data from API, fallback to props, then defaults
  const totalBalance = props.totalBalance ?? totalMainBalance ?? 0;
  const winningBalance = props.winningBalance ?? totalWinningBalance ?? 0;
  const playersCount = props.totalPlayers ?? totalPlayers ?? 0;

  const { balancePercentage, strokeDasharray } = useMemo(() => {
    const safeLiquidity = platformLiquidity > 0 ? platformLiquidity : 0;
    const computedPercentage = safeLiquidity > 0 ? (totalBalance / safeLiquidity) * 100 : 0;
    const clampedPercentage = Math.max(0, Math.min(100, computedPercentage));
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const dasharray = `${(clampedPercentage / 100) * circumference} ${circumference}`;
    return { balancePercentage: clampedPercentage, strokeDasharray: dasharray };
  }, [platformLiquidity, totalBalance]);

  // Show error state if there's an error
  if (error) {
    return (
      <Card className="rounded-xl border border-border">
        <CardHeader className="px-4 py-3">
          <h3 className="text-sm font-medium text-muted-foreground">Platform Liquidity</h3>
        </CardHeader>
        <CardContent className="px-4 py-6">
          <ErrorState message={error} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="px-4 py-3">
        <h3 className="text-sm font-medium text-muted-foreground">Platform Liquidity</h3>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <LoadingState />
        ) : (
          <div>
            <div className="relative w-24 h-24 mx-auto mb-4" role="img" aria-label={`Liquidity gauge at ${balancePercentage.toFixed(0)} percent`}>
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
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
                  {formatCurrency(platformLiquidity)}
                </span>
                <span className="text-xs text-muted-foreground">total</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Main Balance</span>
                <span className="text-foreground font-medium">{formatCurrency(totalBalance)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Winning Balance</span>
                <span className="text-foreground font-medium">{formatCurrency(winningBalance)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Players</span>
                <span className="text-primary font-medium">{new Intl.NumberFormat('en-US', { notation: 'compact' }).format(playersCount)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
