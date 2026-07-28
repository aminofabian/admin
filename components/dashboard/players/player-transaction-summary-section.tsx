'use client';

import { formatCurrency } from '@/lib/utils/formatters';
import { Button } from '@/components/ui';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';

export interface PlayerTransactionSummarySectionProps {
  totalPurchases?: string | number | null;
  totalCashouts?: string | number | null;
  totalTransfers?: string | number | null;
  isLoading?: boolean;
  onOpenAnalytics?: () => void;
}

function SummaryStat({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string;
  isLoading?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      {isLoading ? (
        <div className="mt-1.5 h-5 w-16 animate-pulse bg-gray-200 dark:bg-gray-700" />
      ) : (
        <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </p>
      )}
    </div>
  );
}

export function PlayerTransactionSummarySection({
  totalPurchases,
  totalCashouts,
  totalTransfers,
  isLoading = false,
  onOpenAnalytics,
}: PlayerTransactionSummarySectionProps) {
  return (
    <PlayerDetailPanel
      title="Transaction summary"
      actions={
        isLoading ? (
          <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <SummaryStat
          label="Purchases"
          value={formatCurrency(totalPurchases ?? 0)}
          isLoading={isLoading}
        />
        <SummaryStat
          label="Cashouts"
          value={formatCurrency(totalCashouts ?? 0)}
          isLoading={isLoading}
        />
        <SummaryStat
          label="Transfers"
          value={formatCurrency(totalTransfers ?? 0)}
          isLoading={isLoading}
        />
      </div>

      {onOpenAnalytics ? (
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenAnalytics}
            className="w-full px-3 py-1.5 text-xs font-semibold sm:w-auto"
          >
            Open analytics
          </Button>
        </div>
      ) : null}
    </PlayerDetailPanel>
  );
}
