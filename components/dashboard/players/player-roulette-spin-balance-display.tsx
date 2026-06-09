'use client';

import { useEffect } from 'react';
import { usePlayerRouletteSpinInfo } from '@/hooks/use-player-roulette-spin-info';
import { PlayerRouletteSpinStatusDisplay } from '@/components/dashboard/players/player-roulette-spin-status-display';

export interface PlayerRouletteSpinBalanceDisplayProps {
  playerId: number;
  variant?: 'card' | 'inline';
  className?: string;
  /** Increment to refetch spin balance after admin adjustments. */
  refreshKey?: number;
}

/** Fetches spin_allowance via player-spin-allowances and renders status UI. */
export function PlayerRouletteSpinBalanceDisplay({
  playerId,
  variant = 'card',
  className = '',
  refreshKey,
}: PlayerRouletteSpinBalanceDisplayProps) {
  const { spinInfo, isLoading, error, refresh } = usePlayerRouletteSpinInfo(playerId);

  useEffect(() => {
    if (refreshKey != null && refreshKey > 0) {
      void refresh();
    }
  }, [refreshKey, refresh]);

  return (
    <PlayerRouletteSpinStatusDisplay
      spinInfo={spinInfo}
      isLoading={isLoading}
      error={error}
      variant={variant}
      className={className}
    />
  );
}
