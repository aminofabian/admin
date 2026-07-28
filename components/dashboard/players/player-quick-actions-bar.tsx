'use client';

import { Button } from '@/components/ui';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';

export interface PlayerQuickActionsBarProps {
  onViewTransactions: () => void;
  onViewActivities: () => void;
  onViewTimeline: () => void;
  onOpenPaymentMethods: () => void;
  savedPaymentMethodsCount?: number;
  hasSavedPaymentMethods?: boolean;
}

export function PlayerQuickActionsBar({
  onViewTransactions,
  onViewActivities,
  onViewTimeline,
  onOpenPaymentMethods,
  savedPaymentMethodsCount = 0,
  hasSavedPaymentMethods = false,
}: PlayerQuickActionsBarProps) {
  return (
    <PlayerDetailPanel title="Quick actions">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onViewTransactions}
          className="px-3 py-1.5 text-xs font-semibold"
        >
          Transactions
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onViewActivities}
          className="px-3 py-1.5 text-xs font-semibold"
        >
          Activities
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onViewTimeline}
          className="px-3 py-1.5 text-xs font-semibold"
        >
          Timeline
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOpenPaymentMethods}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
        >
          Payment methods
          {hasSavedPaymentMethods ? (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center bg-gray-200 px-1 text-[10px] font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {savedPaymentMethodsCount}
            </span>
          ) : null}
        </Button>
      </div>
    </PlayerDetailPanel>
  );
}
