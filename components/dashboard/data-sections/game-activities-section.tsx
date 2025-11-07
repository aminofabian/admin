'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { DashboardSectionContainer } from '@/components/dashboard/layout/dashboard-section-container';
import { DashboardSectionHeader } from '@/components/dashboard/layout/dashboard-section-header';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { Badge, Button, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { ActivityDetailsModal, EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionQueuesStore } from '@/stores';
import type { TransactionQueue } from '@/types';
import { HistoryGameActivitiesFilters, HistoryGameActivitiesFiltersState, QueueFilterOption } from '@/components/dashboard/history/history-game-activities-filters';

const GAME_ICON: JSX.Element = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-4 4h2M7 20l1-4h8l1 4M6 8h12l2 4-2 4H6L4 12l2-4zM9 4h6l1 4H8l1-4z" />
  </svg>
);

const HISTORY_EMPTY_STATE = (
  <EmptyState
    title="No game activity history"
    description="No completed or cancelled game activities matched your filters"
  />
);

const DEFAULT_GAME_ACTIVITY_FILTERS: HistoryGameActivitiesFiltersState = {
  status: '',
  userId: '',
};

function buildGameActivityFilterState(advanced: Record<string, string>): HistoryGameActivitiesFiltersState {
  return {
    status: advanced.status ?? '',
    userId: advanced.user_id ?? '',
  };
}

interface GameActivitiesSectionProps {
  showTabs?: boolean;
}

interface HistoryPaginationState {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
}

export function GameActivitiesSection({ showTabs = false }: GameActivitiesSectionProps) {
  // Selective store subscriptions - only subscribe to what we need
  const queues = useTransactionQueuesStore((state) => state.queues);
  const isLoading = useTransactionQueuesStore((state) => state.isLoading);
  const error = useTransactionQueuesStore((state) => state.error);
  const queueFilter = useTransactionQueuesStore((state) => state.filter);
  const advancedFilters = useTransactionQueuesStore((state) => state.advancedFilters);
  const setFilter = useTransactionQueuesStore((state) => state.setFilter);
  const fetchQueues = useTransactionQueuesStore((state) => state.fetchQueues);
  const setAdvancedFilters = useTransactionQueuesStore((state) => state.setAdvancedFilters);
  const clearAdvancedFilters = useTransactionQueuesStore((state) => state.clearAdvancedFilters);
  const totalCount = useTransactionQueuesStore((state) => state.count);
  const next = useTransactionQueuesStore((state) => state.next);
  const previous = useTransactionQueuesStore((state) => state.previous);
  const currentPage = useTransactionQueuesStore((state) => state.currentPage);
  const pageSize = useTransactionQueuesStore((state) => state.pageSize);
  const setPage = useTransactionQueuesStore((state) => state.setPage);

  const [filters, setFilters] = useState<HistoryGameActivitiesFiltersState>(() => buildGameActivityFilterState(advancedFilters));
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  // Initialize filter once
  useEffect(() => {
    setFilter('history');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch queues when dependencies change
  useEffect(() => {
    fetchQueues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueFilter, advancedFilters]);

  // Sync filters with advanced filters
  useEffect(() => {
    setFilters(buildGameActivityFilterState(advancedFilters));

    if (Object.keys(advancedFilters).length > 0) {
      setAreFiltersOpen(true);
    }
  }, [advancedFilters]);

  const handleFilterChange = useCallback((key: keyof HistoryGameActivitiesFiltersState, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    const nextFilters: Record<string, string> = {};

    if (filters.status.trim()) {
      nextFilters.status = filters.status.trim();
    }

    if (filters.userId.trim()) {
      nextFilters.user_id = filters.userId.trim();
    }

    setAdvancedFilters(nextFilters);
  }, [filters, setAdvancedFilters]);

  const handleClearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_GAME_ACTIVITY_FILTERS });
    clearAdvancedFilters();
  }, [clearAdvancedFilters]);

  const handleToggleFilters = useCallback(() => {
    setAreFiltersOpen((previous) => !previous);
  }, []);

  const handleQueueFilterChange = useCallback((value: QueueFilterOption) => {
    setFilter(value);
  }, [setFilter]);

  const handlePageChange = useCallback((page: number) => {
    void setPage(page);
  }, [setPage]);

  const results = useMemo(() => queues ?? [], [queues]);
  const isInitialLoading = useMemo(() => isLoading && !queues, [isLoading, queues]);
  const isEmpty = useMemo(() => !results.length, [results.length]);
  const hasNext = useMemo(() => Boolean(next), [next]);
  const hasPrevious = useMemo(() => Boolean(previous), [previous]);

  return (
    <DashboardSectionContainer
      isLoading={isInitialLoading}
      error={error ?? ''}
      onRetry={fetchQueues}
      isEmpty={isEmpty}
      emptyState={HISTORY_EMPTY_STATE}
    >
      {showTabs && <HistoryTabs />}
      <HistoryGameActivitiesLayout
        queueFilter={queueFilter as QueueFilterOption}
        onQueueFilterChange={handleQueueFilterChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        areFiltersOpen={areFiltersOpen}
        onToggleFilters={handleToggleFilters}
        queues={results}
        pagination={{
          totalCount,
          pageSize,
          currentPage,
          hasNext,
          hasPrevious,
          onPageChange: handlePageChange,
        }}
      />
    </DashboardSectionContainer>
  );
}

interface HistoryGameActivitiesLayoutProps {
  queueFilter: QueueFilterOption;
  onQueueFilterChange: (value: QueueFilterOption) => void;
  filters: HistoryGameActivitiesFiltersState;
  onFilterChange: (key: keyof HistoryGameActivitiesFiltersState, value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  areFiltersOpen: boolean;
  onToggleFilters: () => void;
  queues: TransactionQueue[];
  pagination: HistoryPaginationState;
}

function HistoryGameActivitiesLayout({
  queueFilter,
  onQueueFilterChange,
  filters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  areFiltersOpen,
  onToggleFilters,
  queues,
  pagination,
}: HistoryGameActivitiesLayoutProps) {
  const totalPages = pagination.pageSize > 0
    ? Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))
    : 1;

  const shouldShowPagination = pagination.totalCount > pagination.pageSize || pagination.hasNext || pagination.hasPrevious;

  return (
    <>
      <DashboardSectionHeader
        title="Game Activity History"
        description="Audit completed and cancelled game operations across the platform"
        icon={GAME_ICON}
      />
      <HistoryGameActivitiesFilters
        queueFilter={queueFilter}
        onQueueFilterChange={onQueueFilterChange}
        filters={filters}
        onFilterChange={onFilterChange}
        onApply={onApplyFilters}
        onClear={onClearFilters}
        isOpen={areFiltersOpen}
        onToggle={onToggleFilters}
      />
      <HistoryGameActivitiesTable queues={queues} />
      {shouldShowPagination && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            hasNext={pagination.hasNext}
            hasPrevious={pagination.hasPrevious}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </>
  );
}

interface HistoryGameActivitiesTableProps {
  queues: TransactionQueue[];
}

function HistoryGameActivitiesTable({ queues }: HistoryGameActivitiesTableProps) {
  const [selectedActivity, setSelectedActivity] = useState<TransactionQueue | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleViewActivity = useCallback((activity: TransactionQueue) => {
    setSelectedActivity(activity);
    setIsViewModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsViewModalOpen(false);
    setSelectedActivity(null);
  }, []);

  if (!queues.length) {
    return null;
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Game Username</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>New Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((activity) => (
                <HistoryGameActivityRow key={activity.id} activity={activity} onView={handleViewActivity} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          isOpen={isViewModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}


interface HistoryGameActivityRowProps {
  activity: TransactionQueue;
  onView: (activity: TransactionQueue) => void;
}

const HistoryGameActivityRow = memo(function HistoryGameActivityRow({ activity, onView }: HistoryGameActivityRowProps) {
  // Memoize expensive computations
  const statusVariant = useMemo(() => mapStatusToVariant(activity.status), [activity.status]);
  const typeLabel = useMemo(() => mapTypeToLabel(activity.type), [activity.type]);
  const typeVariant = useMemo(() => mapTypeToVariant(activity.type), [activity.type]);
  const formattedAmount = useMemo(() => formatCurrency(activity.amount), [activity.amount]);
  const isRecharge = useMemo(() => activity.type === 'recharge_game', [activity.type]);
  const isRedeem = useMemo(() => activity.type === 'redeem_game', [activity.type]);
  const shouldShowDash = useMemo(() => {
    const amountValue = parseFloat(activity.amount || '0');
    const isZeroAmount = amountValue === 0 || isNaN(amountValue);
    const typeStr = String(activity.type);
    const isNonMonetaryType = typeStr === 'create_game' || 
                              typeStr === 'reset_password' || 
                              typeStr === 'change_password' ||
                              typeStr === 'add_user_game';
    return isZeroAmount && isNonMonetaryType;
  }, [activity.amount, activity.type]);
  
  const bonusAmount = useMemo(() => {
    const bonus = activity.bonus_amount || activity.data?.bonus_amount;
    if (!bonus) return null;
    const bonusValue = typeof bonus === 'string' || typeof bonus === 'number' 
      ? parseFloat(String(bonus)) 
      : 0;
    return bonusValue > 0 ? bonus : null;
  }, [activity.bonus_amount, activity.data?.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

  const credit = useMemo(() => {
    const creditValue = activity.data?.credit;
    if (creditValue === undefined || creditValue === null) return null;
    return formatCurrency(String(creditValue));
  }, [activity.data?.credit]);

  const winnings = useMemo(() => {
    const winningsValue = activity.data?.winnings;
    if (winningsValue === undefined || winningsValue === null) return null;
    return formatCurrency(String(winningsValue));
  }, [activity.data?.winnings]);

  // New balance from data object
  const newCreditsBalance = useMemo(() => {
    const credits = activity.data?.new_credits_balance;
    if (credits === undefined || credits === null) return null;
    const creditsValue = typeof credits === 'string' || typeof credits === 'number'
      ? parseFloat(String(credits))
      : null;
    return creditsValue !== null && !isNaN(creditsValue) ? formatCurrency(String(creditsValue)) : null;
  }, [activity.data?.new_credits_balance]);

  const newWinningBalance = useMemo(() => {
    const winnings = activity.data?.new_winning_balance;
    if (winnings === undefined || winnings === null) return null;
    const winningsValue = typeof winnings === 'string' || typeof winnings === 'number'
      ? parseFloat(String(winnings))
      : null;
    return winningsValue !== null && !isNaN(winningsValue) ? formatCurrency(String(winningsValue)) : null;
  }, [activity.data?.new_winning_balance]);

  const zeroCurrency = formatCurrency('0');

  const creditsDisplay = useMemo(() => {
    if (newCreditsBalance) return newCreditsBalance;
    if (credit) return credit;
    return zeroCurrency;
  }, [newCreditsBalance, credit, zeroCurrency]);

  const winningsDisplay = useMemo(() => {
    if (newWinningBalance) return newWinningBalance;
    if (winnings) return winnings;
    return zeroCurrency;
  }, [newWinningBalance, winnings, zeroCurrency]);

  // Website user (actual user on the platform)
  const websiteUsername = useMemo(() => {
    if (typeof activity.user_username === 'string' && activity.user_username.trim()) {
      return activity.user_username.trim();
    }
    return null;
  }, [activity.user_username]);

  const websiteEmail = useMemo(() => {
    if (typeof activity.user_email === 'string' && activity.user_email.trim()) {
      return activity.user_email.trim();
    }
    return null;
  }, [activity.user_email]);

  // Game username (username used in the game)
  const gameUsername = useMemo(() => {
    // 1. Top-level game_username field
    if (typeof activity.game_username === 'string' && activity.game_username.trim()) {
      return activity.game_username.trim();
    }
    // 2. Username in data object (for completed transactions)
    if (activity.data && typeof activity.data === 'object' && activity.data !== null) {
      const dataUsername = activity.data.username;
      if (typeof dataUsername === 'string' && dataUsername.trim()) {
        return dataUsername.trim();
      }
    }
    return null;
  }, [activity.game_username, activity.data]);

  const userInitial = useMemo(() => {
    if (websiteUsername) {
      return websiteUsername.charAt(0).toUpperCase();
    }
    // Fallback to user_id if no username available
    return activity.user_id ? String(activity.user_id).charAt(0) : '—';
  }, [websiteUsername, activity.user_id]);

  const formattedCreatedAt = useMemo(() => formatDate(activity.created_at), [activity.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(activity.updated_at), [activity.updated_at]);
  const showUpdatedAt = useMemo(() => activity.updated_at !== activity.created_at, [activity.updated_at, activity.created_at]);

  const handleViewClick = useCallback(() => {
    onView(activity);
  }, [activity, onView]);

  const amountColorClass = useMemo(() => {
    if (shouldShowDash) return '';
    if (isRedeem) return 'text-red-600 dark:text-red-400';
    if (isRecharge) return 'text-green-600 dark:text-green-400';
    return 'text-foreground';
  }, [isRedeem, isRecharge, shouldShowDash]);

  const bonusColorClass = useMemo(() => {
    if (shouldShowDash) return '';
    return isRedeem ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  }, [isRedeem, shouldShowDash]);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {userInitial}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {websiteUsername || `User ${activity.user_id}`}
            </div>
            {websiteEmail && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {websiteEmail}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={typeVariant} className="capitalize">
          {typeLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="font-medium">{activity.game}</div>
      </TableCell>
      <TableCell>
        {gameUsername ? (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {gameUsername}
          </div>
        ) : activity.status === 'cancelled' ? (
          <Badge variant="default" className="text-xs">
            Cancelled
          </Badge>
        ) : (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            —
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className={`text-sm font-bold ${amountColorClass}`}>
          {shouldShowDash ? '-' : formattedAmount}
          {!shouldShowDash && formattedBonus && (
            <div className={`text-xs font-semibold mt-0.5 ${bonusColorClass}`}>
              +{formattedBonus} bonus
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            C: {creditsDisplay}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            W: {winningsDisplay}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {activity.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{formattedCreatedAt}</div>
          {showUpdatedAt && (
            <div>{formattedUpdatedAt}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="primary"
          size="sm"
          className="min-w-[7.5rem]"
          onClick={handleViewClick}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.activity.id === nextProps.activity.id &&
    prevProps.activity.status === nextProps.activity.status &&
    prevProps.activity.type === nextProps.activity.type &&
    prevProps.activity.amount === nextProps.activity.amount &&
    prevProps.activity.bonus_amount === nextProps.activity.bonus_amount &&
    prevProps.activity.operator === nextProps.activity.operator &&
    prevProps.activity.user_email === nextProps.activity.user_email &&
    prevProps.activity.updated_at === nextProps.activity.updated_at &&
    prevProps.onView === nextProps.onView
  );
});

// Memoize pure functions
const mapStatusToVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'danger';
  return 'default';
};

const mapTypeToLabel = (type: string): string => {
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game') return 'Add User';
  if (type === 'change_password') return 'Reset';
  return type;
};

const mapTypeToVariant = (type: string): 'success' | 'danger' | 'info' | 'default' => {
  if (type === 'recharge_game') return 'success'; // Green for recharge
  if (type === 'redeem_game') return 'danger'; // Red for cashout/redeem
  return 'info'; // Default for other types (Reset, create game, etc.)
};