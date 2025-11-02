'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardSectionContainer } from '@/components/dashboard/layout/dashboard-section-container';
import { DashboardSectionHeader } from '@/components/dashboard/layout/dashboard-section-header';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { Badge, Button, Modal, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionQueuesStore } from '@/stores';
import type { TransactionQueue } from '@/types';
import { HistoryGameActivitiesFilters, HistoryGameActivitiesFiltersState, QueueFilterOption } from '@/components/dashboard/history/history-game-activities-filters';

const HISTORY_BADGE = (
  <Badge variant="info" className="uppercase tracking-wide">
    History Only
  </Badge>
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

export function GameActivitiesSection({ showTabs = false }: GameActivitiesSectionProps) {
  // Selective store subscriptions - only subscribe to what we need
  const queues = useTransactionQueuesStore((state) => state.queues);
  const isLoading = useTransactionQueuesStore((state) => state.isLoading);
  const error = useTransactionQueuesStore((state) => state.error);
  const currentPage = useTransactionQueuesStore((state) => state.currentPage);
  const queueFilter = useTransactionQueuesStore((state) => state.filter);
  const advancedFilters = useTransactionQueuesStore((state) => state.advancedFilters);
  const setPage = useTransactionQueuesStore((state) => state.setPage);
  const setFilter = useTransactionQueuesStore((state) => state.setFilter);
  const fetchQueues = useTransactionQueuesStore((state) => state.fetchQueues);
  const setAdvancedFilters = useTransactionQueuesStore((state) => state.setAdvancedFilters);
  const clearAdvancedFilters = useTransactionQueuesStore((state) => state.clearAdvancedFilters);

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
  }, [currentPage, queueFilter, advancedFilters]);

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

  const results = useMemo(() => queues?.results ?? [], [queues?.results]);
  const isInitialLoading = useMemo(() => isLoading && !queues, [isLoading, queues]);
  const isEmpty = useMemo(() => !results.length, [results.length]);
  const totalCount = useMemo(() => queues?.count ?? 0, [queues?.count]);

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
        currentPage={currentPage}
        totalCount={totalCount}
        onPageChange={setPage}
        pageSize={10}
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
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: HistoryGameActivitiesLayoutProps) {
  return (
    <>
      <DashboardSectionHeader
        title="Game Activity History"
        description="Audit completed and cancelled game operations across the platform"
        badge={HISTORY_BADGE}
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
      <HistoryGameActivitiesTable
        queues={queues}
        currentPage={currentPage}
        totalCount={totalCount}
        onPageChange={onPageChange}
        pageSize={pageSize}
      />
    </>
  );
}

interface HistoryGameActivitiesTableProps {
  queues: TransactionQueue[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function HistoryGameActivitiesTable({
  queues,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: HistoryGameActivitiesTableProps) {
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

  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);
  const hasNext = useMemo(() => currentPage * pageSize < totalCount, [currentPage, pageSize, totalCount]);
  const hasPrevious = useMemo(() => currentPage > 1, [currentPage]);

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
                <TableHead>New Game Balance</TableHead>
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
        {totalCount > pageSize && (
          <div className="border-t border-border px-4 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
            />
          </div>
        )}
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

interface ActivityDetailsModalProps {
  activity: TransactionQueue;
  isOpen: boolean;
  onClose: () => void;
}

const ActivityDetailsModal = memo(function ActivityDetailsModal({
  activity,
  isOpen,
  onClose,
}: ActivityDetailsModalProps) {
  // Memoize expensive computations
  const statusVariant = useMemo(() => mapStatusToVariant(activity.status), [activity.status]);
  const typeLabel = useMemo(() => mapTypeToLabel(activity.type), [activity.type]);
  const typeVariant = useMemo(() => mapTypeToVariant(activity.type), [activity.type]);
  const formattedAmount = useMemo(() => formatCurrency(activity.amount), [activity.amount]);
  
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

  const formattedBalance = useMemo(() => {
    return formatCurrency(String(activity.data?.balance ?? '0'));
  }, [activity.data?.balance]);

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

  const operator = useMemo(() => {
    return activity.operator || (typeof activity.data?.operator === 'string' ? activity.data.operator : '—');
  }, [activity.operator, activity.data?.operator]);

  const operationType = useMemo(() => {
    return typeof activity.data?.operation_type === 'string' ? activity.data.operation_type : '—';
  }, [activity.data?.operation_type]);

  const formattedCreatedAt = useMemo(() => formatDate(activity.created_at), [activity.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(activity.updated_at), [activity.updated_at]);
  const showUpdatedAt = useMemo(() => activity.updated_at !== activity.created_at, [activity.updated_at, activity.created_at]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Activity Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Section - Status and Type */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant} className="text-sm px-3 py-1">
              {activity.status}
            </Badge>
            <Badge variant={typeVariant} className="text-sm px-3 py-1 capitalize">
              {typeLabel}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{formattedAmount}</div>
            {formattedBonus && (
              <div className="text-sm font-semibold text-green-600">
                +{formattedBonus} bonus
              </div>
            )}
          </div>
        </div>

        {/* Activity IDs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity ID</label>
            <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
              {activity.id}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operator</label>
            <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
              {operator}
            </div>
          </div>
        </div>

        {/* Game Balance Section */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Game</label>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{activity.game}</div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">New Game Balance</label>
            <div className="text-lg font-bold text-green-900 dark:text-green-100">{formattedBalance}</div>
          </div>
        </div>

        {/* User Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Website User</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Username</label>
              <div className="text-sm font-semibold text-foreground">
                {websiteUsername || `User ${activity.user_id}`}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Email</label>
              <div className="text-sm text-foreground">
                {websiteEmail || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Game Username */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Game Username</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Game Username</label>
              {gameUsername ? (
                <div className="text-sm font-semibold text-foreground">
                  {gameUsername}
                </div>
              ) : activity.status === 'cancelled' ? (
                <Badge variant="default" className="text-xs">
                  Cancelled
                </Badge>
              ) : (
                <div className="text-sm font-semibold text-foreground">
                  —
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Operation Type</label>
              <Badge variant="default" className="text-xs uppercase">
                {operationType}
              </Badge>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Timestamps</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Created</label>
              <div className="text-sm font-medium text-foreground">{formattedCreatedAt}</div>
            </div>
            {showUpdatedAt && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">Updated</label>
                <div className="text-sm font-medium text-foreground">{formattedUpdatedAt}</div>
              </div>
            )}
          </div>
        </div>

        {/* Remarks */}
        {activity.remarks && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Remarks</h3>
            <div className="text-sm text-foreground bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
              {activity.remarks}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});

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

  const formattedBalance = useMemo(() => {
    return formatCurrency(String(activity.data?.balance ?? '0'));
  }, [activity.data?.balance]);

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
        <div className="font-semibold">
          {formattedAmount}
          {formattedBonus && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              +{formattedBonus} bonus
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        {(credit || winnings) ? (
          <div className="space-y-1">
            {credit && (
              <div className="text-sm font-semibold text-foreground">
                Credit: {credit}
              </div>
            )}
            {winnings && (
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                Winnings: {winnings}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm font-semibold text-foreground">{formattedBalance}</div>
        )}
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
          variant="ghost"
          size="sm"
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
    prevProps.activity.amount === nextProps.activity.amount &&
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
  return type;
};

const mapTypeToVariant = (type: string): 'success' | 'danger' | 'info' | 'default' => {
  if (type === 'recharge_game') return 'success'; // Green for recharge
  if (type === 'redeem_game') return 'danger'; // Red for cashout/redeem
  return 'info'; // Default for other types (reset password, create game, etc.)
};
