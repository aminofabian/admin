'use client';

import { Button } from '@/components/ui';
import type { PlayerGame } from '@/types';

export interface PlayerGamePasswordRevealProps {
  game: PlayerGame;
  isVisible: boolean;
  onToggleVisibility: () => void;
  layout?: 'default' | 'compact';
}

export function PlayerGamePasswordReveal({
  game,
  isVisible,
  onToggleVisibility,
  layout = 'default',
}: PlayerGamePasswordRevealProps) {
  const raw = game.password;
  const hasGamePassword = typeof raw === 'string' && raw.length > 0;

  const displayValue = !hasGamePassword
    ? 'Not available'
    : isVisible
      ? raw
      : '••••••••';

  const isCompact = layout === 'compact';

  return (
    <div
      className={
        isCompact
          ? 'mt-1.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2'
          : 'mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3'
      }
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Game password
        </p>
        <p
          className={`break-all font-mono text-gray-800 dark:text-gray-200 ${
            isCompact ? 'text-[11px]' : 'text-xs'
          }`}
        >
          {displayValue}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!hasGamePassword}
        onClick={onToggleVisibility}
        className={isCompact ? 'shrink-0 px-2 py-1 text-[10px]' : 'shrink-0'}
        aria-label={isVisible ? 'Hide game password' : 'Show game password'}
      >
        {isVisible ? 'Hide' : 'Show password'}
      </Button>
    </div>
  );
}
