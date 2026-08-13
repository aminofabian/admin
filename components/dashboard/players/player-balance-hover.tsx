'use client';

import type { ReactElement, ReactNode } from 'react';
import { cn, formatCurrency } from '@/lib/utils/formatters';

export type PlayerBalanceTotals = {
  balance?: string | number | null;
  total_purchases?: string | number | null;
  total_cashouts?: string | number | null;
  total_transfers?: string | number | null;
};

function formatTotal(value: string | number | null | undefined): string {
  if (value == null || value === '') {
    return formatCurrency(0);
  }
  return formatCurrency(value);
}

function BalanceTotalsTooltip({
  player,
  align,
  side,
}: {
  player: PlayerBalanceTotals;
  align: 'center' | 'end';
  side: 'top' | 'bottom';
}): ReactElement {
  return (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none absolute z-30 w-48 rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-lg',
        'opacity-0 invisible scale-95 transition-all duration-150',
        'group-hover/balance:opacity-100 group-hover/balance:visible group-hover/balance:scale-100',
        'group-focus-within/balance:opacity-100 group-focus-within/balance:visible group-focus-within/balance:scale-100',
        'dark:border-gray-700 dark:bg-gray-900',
        side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        align === 'end'
          ? 'right-0 after:right-3 after:left-auto'
          : 'left-1/2 -translate-x-1/2 after:left-1/2 after:-translate-x-1/2',
        'after:absolute',
        side === 'top'
          ? 'after:top-full after:border-t-white dark:after:border-t-gray-900'
          : 'after:bottom-full after:border-b-white dark:after:border-b-gray-900',
        'after:border-4 after:border-transparent',
      )}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Lifetime totals
      </p>
      <dl className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[11px] text-gray-600 dark:text-gray-400">Purchases</dt>
          <dd className="text-[11px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatTotal(player.total_purchases)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[11px] text-gray-600 dark:text-gray-400">Cashouts</dt>
          <dd className="text-[11px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatTotal(player.total_cashouts)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[11px] text-gray-600 dark:text-gray-400">Transfers</dt>
          <dd className="text-[11px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatTotal(player.total_transfers)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

type PlayerBalanceHoverProps = {
  player: PlayerBalanceTotals;
  children: ReactNode;
  className?: string;
  align?: 'center' | 'end';
  side?: 'top' | 'bottom';
};

/**
 * Wraps balance UI and shows purchases / cashouts / transfers on hover or keyboard focus.
 */
export function PlayerBalanceHover({
  player,
  children,
  className,
  align = 'center',
  side = 'top',
}: PlayerBalanceHoverProps): ReactElement {
  return (
    <div
      tabIndex={0}
      className={cn('group/balance relative inline-flex cursor-help outline-none', className)}
      aria-label={`Balance ${formatTotal(player.balance)}. Lifetime purchases ${formatTotal(player.total_purchases)}, cashouts ${formatTotal(player.total_cashouts)}, transfers ${formatTotal(player.total_transfers)}.`}
    >
      {children}
      <BalanceTotalsTooltip player={player} align={align} side={side} />
    </div>
  );
}

type PlayerBalanceCardProps = {
  player: PlayerBalanceTotals;
  className?: string;
};

/** Mobile card-style balance box with hover totals. */
export function PlayerBalanceCard({ player, className }: PlayerBalanceCardProps): ReactElement {
  return (
    <PlayerBalanceHover player={player} className={cn('w-full', className)}>
      <div className="w-full rounded-md bg-blue-50 p-2 transition-colors group-hover/balance:bg-blue-100/80 dark:bg-blue-950/20 dark:group-hover/balance:bg-blue-950/40">
        <div className="mb-0.5 flex items-center gap-1.5">
          <svg
            className="h-3 w-3 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-[10px] font-medium uppercase text-blue-700 dark:text-blue-300">
            Balance
          </span>
        </div>
        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {formatTotal(player.balance)}
        </p>
      </div>
    </PlayerBalanceHover>
  );
}

type PlayerBalanceTableValueProps = {
  player: PlayerBalanceTotals;
};

/** Desktop table balance cell value with hover totals. */
export function PlayerBalanceTableValue({ player }: PlayerBalanceTableValueProps): ReactElement {
  return (
    <PlayerBalanceHover player={player} align="end" side="bottom" className="justify-end">
      <div className="rounded px-1.5 py-0.5 text-sm font-semibold tabular-nums text-blue-600 transition-colors group-hover/balance:bg-blue-50 dark:text-blue-400 dark:group-hover/balance:bg-blue-950/30">
        {formatTotal(player.balance)}
      </div>
    </PlayerBalanceHover>
  );
}
