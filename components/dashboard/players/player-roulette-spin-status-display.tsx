'use client';

import type { PlayerRouletteSpinInfo } from '@/lib/roulette/player-spin-allowance-info';

export interface PlayerRouletteSpinStatusDisplayProps {
  spinInfo: PlayerRouletteSpinInfo | null;
  isLoading?: boolean;
  error?: string | null;
  variant?: 'card' | 'inline';
  className?: string;
}

export function PlayerRouletteSpinStatusDisplay({
  spinInfo,
  isLoading = false,
  error = null,
  variant = 'card',
  className = '',
}: PlayerRouletteSpinStatusDisplayProps) {
  const isUnlimited = Boolean(spinInfo?.is_unlimited);
  const spinBalance = spinInfo?.spin_balance ?? 0;

  if (variant === 'inline') {
    return (
      <div
        className={`mt-4 space-y-2 rounded-xl bg-indigo-500/[0.07] px-3 py-2.5 ring-1 ring-indigo-500/15 md:mt-2 md:rounded-md md:px-2 md:py-1.5 ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 md:h-5 md:w-5 md:rounded">
              <svg
                className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 md:h-3 md:w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Spin balance
            </span>
          </div>
          {isLoading ? (
            <span className="text-xs text-muted-foreground">…</span>
          ) : error ? (
            <span className="text-[10px] text-red-600 dark:text-red-400" title={error}>
              —
            </span>
          ) : isUnlimited ? (
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">∞</span>
          ) : (
            <p className="text-sm font-bold tabular-nums text-indigo-700 dark:text-indigo-300 md:text-xs">
              {spinBalance}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border border-indigo-100 bg-indigo-50/60 p-2.5 dark:border-indigo-900/40 dark:bg-indigo-950/20 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-800/80 dark:text-indigo-200/80">
          Spin balance
          {spinInfo?.date ? ` · ${spinInfo.date}` : ''}
        </p>
        {isLoading ? (
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Loading…</span>
        ) : error ? (
          <span className="text-[11px] text-red-600 dark:text-red-400" title={error}>
            Unavailable
          </span>
        ) : isUnlimited ? (
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Unlimited</span>
        ) : (
          <span className="text-lg font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
            {spinBalance}
          </span>
        )}
      </div>
    </div>
  );
}
