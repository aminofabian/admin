'use client';

import { usePlayerRouletteSpinInfo } from '@/hooks/use-player-roulette-spin-info';
import { PlayerRouletteSpinStatusDisplay } from '@/components/dashboard/players/player-roulette-spin-status-display';

export interface PlayerRouletteSpinBalanceDisplayProps {
  playerId: number;
  variant?: 'card' | 'inline';
  className?: string;
}

/** Fetches spin_allowance via player-spin-allowances and renders status UI. */
export function PlayerRouletteSpinBalanceDisplay({
  playerId,
  variant = 'card',
  className = '',
}: PlayerRouletteSpinBalanceDisplayProps) {
  const { spinInfo, isLoading, error } = usePlayerRouletteSpinInfo(playerId);

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
