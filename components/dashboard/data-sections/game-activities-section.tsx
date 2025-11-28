'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardSectionContainer } from '@/components/dashboard/layout/dashboard-section-container';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { Badge, Button, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton } from '@/components/ui';
import { ActivityDetailsModal, EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionQueuesStore } from '@/stores';
import { gamesApi } from '@/lib/api';
import type { TransactionQueue, Game } from '@/types';
import { HistoryGameActivitiesFilters, HistoryGameActivitiesFiltersState, QueueFilterOption } from '@/components/dashboard/history/history-game-activities-filters';

const HISTORY_EMPTY_STATE = (
  <EmptyState
    title="No game activity history"
    description="No completed or cancelled game activities matched your filters"
  />
);

const GAME_ACTIVITIES_SKELETON = (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
        <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
        <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-48 shrink-0" />
        <div className="flex-1 min-w-0" />
      </div>
    </div>

    {/* Filters Skeleton */}
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>

    {/* Table Skeleton */}
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Table Header Skeleton */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-9 gap-4 px-4 py-3">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          </div>
          
          {/* Table Rows Skeleton */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-9 gap-4 px-4 py-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-5 w-32" />
                <div className="flex justify-end">
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DEFAULT_GAME_ACTIVITY_FILTERS: HistoryGameActivitiesFiltersState = {
  username: '',
  email: '',
  transaction_id: '',
  operator: '',
  type: '',
  game: '',
  game_username: '',
  status: '',
  date_from: '',
  date_to: '',
};

function buildGameActivityFilterState(advanced: Record<string, string>): HistoryGameActivitiesFiltersState {
  return {
    username: advanced.username ?? '',
    email: advanced.email ?? '',
    transaction_id: advanced.transaction_id ?? '',
    operator: advanced.operator ?? '',
    type: advanced.type ?? '',
    game: advanced.game ?? '',
    game_username: advanced.game_username ?? '',
    status: advanced.status ?? '',
    date_from: advanced.date_from ?? '',
    date_to: advanced.date_to ?? '',
  };
}

interface GameActivitiesSectionProps {
  showTabs?: boolean;
  initialUsername?: string | null;
  openFiltersOnMount?: boolean;
}

interface HistoryPaginationState {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
}

export function GameActivitiesSection({ showTabs = false, initialUsername, openFiltersOnMount = false }: GameActivitiesSectionProps) {
  // Selective store subscriptions - only subscribe to what we need
  const queues = useTransactionQueuesStore((state) => state.queues);
  const isLoading = useTransactionQueuesStore((state) => state.isLoading);
  const error = useTransactionQueuesStore((state) => state.error);
  const queueFilter = useTransactionQueuesStore((state) => state.filter);
  const advancedFilters = useTransactionQueuesStore((state) => state.advancedFilters);
  const setFilter = useTransactionQueuesStore((state) => state.setFilter);
  const fetchQueues = useTransactionQueuesStore((state) => state.fetchQueues);
  const setAdvancedFilters = useTransactionQueuesStore((state) => state.setAdvancedFilters);
  const setAdvancedFiltersWithoutFetch = useTransactionQueuesStore((state) => state.setAdvancedFiltersWithoutFetch);
  const clearAdvancedFilters = useTransactionQueuesStore((state) => state.clearAdvancedFilters);
  const totalCount = useTransactionQueuesStore((state) => state.count);
  const next = useTransactionQueuesStore((state) => state.next);
  const previous = useTransactionQueuesStore((state) => state.previous);
  const currentPage = useTransactionQueuesStore((state) => state.currentPage);
  const pageSize = useTransactionQueuesStore((state) => state.pageSize);
  const setPage = useTransactionQueuesStore((state) => state.setPage);

  const [filters, setFilters] = useState<HistoryGameActivitiesFiltersState>(() => {
    const baseFilters = buildGameActivityFilterState(advancedFilters);
    // If initialUsername is provided, pre-fill it (but don't apply)
    if (initialUsername && !baseFilters.username) {
      return { ...baseFilters, username: initialUsername };
    }
    return baseFilters;
  });
  const [areFiltersOpen, setAreFiltersOpen] = useState(openFiltersOnMount || false);
  const [gameOptions, setGameOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isGameLoading, setIsGameLoading] = useState(false);

  // Initialize filter once
  useEffect(() => {
    setFilter('history');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch queues when dependencies change (but skip if we're setting initial filter)
  const isSettingInitialFilterRef = useRef(false);
  useEffect(() => {
    if (isSettingInitialFilterRef.current) {
      return;
    }
    fetchQueues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueFilter, advancedFilters]);

  // Handle initial username prop - pre-fill filter and automatically apply it
  const previousInitialUsernameRef = useRef<string | null | undefined>(undefined);
  const getStoreState = useTransactionQueuesStore.getState;
  
  useEffect(() => {
    // Only process if username changed and filter is history
    if (initialUsername && queueFilter === 'history' && previousInitialUsernameRef.current !== initialUsername) {
      const trimmedUsername = initialUsername.trim();
      previousInitialUsernameRef.current = trimmedUsername;
      isSettingInitialFilterRef.current = true;
      
      // Pre-fill the filter form
      setFilters(prev => ({ ...prev, username: trimmedUsername }));
      setAreFiltersOpen(true);
      
      // Clear previous filters first, then set the new username filter
      // This ensures we don't have stale data from previous user
      setAdvancedFiltersWithoutFetch({});
      
      // Use setTimeout to ensure clear completes, then set new filter
      setTimeout(() => {
        const filterUpdate: Record<string, string> = {
          username: trimmedUsername,
        };
        setAdvancedFiltersWithoutFetch(filterUpdate);
        
        // Then fetch after another brief delay
        setTimeout(() => {
          const currentState = getStoreState();
          console.log('🔍 Game Activities - Verifying filter state before fetch:', {
            advancedFilters: currentState.advancedFilters,
            username: currentState.advancedFilters.username,
            filter: currentState.filter,
            expectedUsername: trimmedUsername,
          });
          
          isSettingInitialFilterRef.current = false;
          fetchQueues();
        }, 50);
      }, 50);
    } else if (!initialUsername && previousInitialUsernameRef.current !== undefined && previousInitialUsernameRef.current !== null) {
      // Clear filter if username was removed
      previousInitialUsernameRef.current = null;
      setAdvancedFiltersWithoutFetch({});
      setTimeout(() => {
        isSettingInitialFilterRef.current = false;
        fetchQueues();
      }, 50);
    }
  }, [initialUsername, queueFilter, setAdvancedFiltersWithoutFetch, fetchQueues, getStoreState]);

  // Prevent the auto-fetch useEffect from running while we're setting initial filters
  useEffect(() => {
    if (isSettingInitialFilterRef.current) {
      return;
    }
    fetchQueues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueFilter, advancedFilters]);

  // Sync filters with advanced filters
  useEffect(() => {
    const filterState = buildGameActivityFilterState(advancedFilters);
    
    // Ensure date values are properly formatted for HTML date inputs (YYYY-MM-DD)
    if (filterState.date_from) {
      const dateFromValue = filterState.date_from.trim();
      if (dateFromValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateFromValue)) {
        const parsedDate = new Date(dateFromValue);
        if (!isNaN(parsedDate.getTime())) {
          filterState.date_from = parsedDate.toISOString().split('T')[0];
        }
      }
    }
    
    if (filterState.date_to) {
      const dateToValue = filterState.date_to.trim();
      if (dateToValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateToValue)) {
        const parsedDate = new Date(dateToValue);
        if (!isNaN(parsedDate.getTime())) {
          filterState.date_to = parsedDate.toISOString().split('T')[0];
        }
      }
    }
    
    setFilters(filterState);

    if (Object.keys(advancedFilters).length > 0) {
      setAreFiltersOpen(true);
    }
  }, [advancedFilters]);

  // Fetch games for dropdown
  useEffect(() => {
    let isMounted = true;

    const loadGames = async () => {
      setIsGameLoading(true);

      try {
        const data = await gamesApi.list();

        if (!isMounted) {
          return;
        }

        // Handle paginated response with results array
        const games = Array.isArray(data) 
          ? data 
          : (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results))
            ? data.results
            : [];

        const uniqueGames = new Map<string, string>();

        games.forEach((game: Game) => {
          if (game?.title) {
            uniqueGames.set(game.title, game.title);
          }
        });

        const mappedOptions = Array.from(uniqueGames.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

        setGameOptions(mappedOptions);
      } catch (error) {
        console.error('Failed to load games for game activity filters:', error);
      } finally {
        if (isMounted) {
          setIsGameLoading(false);
        }
      }
    };

    loadGames();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFilterChange = useCallback((key: keyof HistoryGameActivitiesFiltersState, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    // Sanitize filters - keep only non-empty values
    const sanitized = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => {
        if (typeof value === 'string') {
          return value.trim() !== '';
        }
        return Boolean(value);
      })
    ) as Record<string, string>;

    // Ensure date values are properly formatted (YYYY-MM-DD) before applying
    if (sanitized.date_from) {
      const dateFromValue = sanitized.date_from.trim();
      if (dateFromValue) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFromValue)) {
          const parsedDate = new Date(dateFromValue);
          if (!isNaN(parsedDate.getTime())) {
            sanitized.date_from = parsedDate.toISOString().split('T')[0];
          }
        }
      }
    }

    if (sanitized.date_to) {
      const dateToValue = sanitized.date_to.trim();
      if (dateToValue) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateToValue)) {
          const parsedDate = new Date(dateToValue);
          if (!isNaN(parsedDate.getTime())) {
            sanitized.date_to = parsedDate.toISOString().split('T')[0];
          }
        }
      }
    }

    // Use setAdvancedFiltersWithoutFetch to prevent duplicate API calls
    // The useEffect will handle fetching with the new filters
    setAdvancedFiltersWithoutFetch(sanitized);
  }, [filters, setAdvancedFiltersWithoutFetch]);

  const handleClearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_GAME_ACTIVITY_FILTERS });
    // Use setAdvancedFiltersWithoutFetch to prevent duplicate API calls
    // The useEffect will handle fetching with cleared filters
    setAdvancedFiltersWithoutFetch({});
  }, [setAdvancedFiltersWithoutFetch]);

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
  const isInitialLoading = useMemo(() => isLoading, [isLoading]);
  const isEmpty = useMemo(() => !results.length && !isLoading, [results.length, isLoading]);
  const hasNext = useMemo(() => Boolean(next), [next]);
  const hasPrevious = useMemo(() => Boolean(previous), [previous]);

  return (
    <DashboardSectionContainer
      isLoading={isInitialLoading}
      error={error ?? ''}
      onRetry={fetchQueues}
      isEmpty={false}
      emptyState={null}
      loadingState={GAME_ACTIVITIES_SKELETON}
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
        gameOptions={gameOptions}
        isGameLoading={isGameLoading}
        isLoading={isLoading}
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
  gameOptions: Array<{ value: string; label: string }>;
  isGameLoading: boolean;
  isLoading: boolean;
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
  gameOptions,
  isGameLoading,
  isLoading,
}: HistoryGameActivitiesLayoutProps) {
  const totalPages = pagination.pageSize > 0
    ? Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))
    : 1;

  const shouldShowPagination = pagination.totalCount > pagination.pageSize || pagination.hasNext || pagination.hasPrevious;

  return (
    <>
      {/* Compact Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-4 4h2M7 20l1-4h8l1 4M6 8h12l2 4-2 4H6L4 12l2-4zM9 4h6l1 4H8l1-4z" />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            Game Activity History
          </h2>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
        </div>
      </div>
      <HistoryGameActivitiesFilters
        queueFilter={queueFilter}
        onQueueFilterChange={onQueueFilterChange}
        filters={filters}
        onFilterChange={onFilterChange}
        onApply={onApplyFilters}
        onClear={onClearFilters}
        isOpen={areFiltersOpen}
        onToggle={onToggleFilters}
        gameOptions={gameOptions}
        isGameLoading={isGameLoading}
        isLoading={isLoading}
      />
      <HistoryGameActivitiesTable 
        queues={queues} 
        pagination={pagination}
        totalPages={totalPages}
        shouldShowPagination={shouldShowPagination}
      />
    </>
  );
}

interface HistoryGameActivitiesTableProps {
  queues: TransactionQueue[];
  pagination: HistoryPaginationState;
  totalPages: number;
  shouldShowPagination: boolean;
}

function HistoryGameActivitiesTable({ 
  queues, 
  pagination, 
  totalPages, 
  shouldShowPagination 
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

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!queues.length ? (
          <div className="py-12">
            <EmptyState 
              title="No game activity history" 
              description="No completed or cancelled game activities matched your filters"
            />
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
              {queues.map((activity) => (
                <GameActivityCard
                  key={activity.id}
                  activity={activity}
                  onView={handleViewActivity}
                />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
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

            {shouldShowPagination && (
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
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

  // Check if this is a reset or add user action - these should show hyphen for balance
  const shouldShowBlankBalance = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === 'change_password' || typeStr === 'add_user_game' || typeStr === 'create_game';
  }, [activity.type]);

  const creditsDisplay = useMemo(() => {
    if (shouldShowBlankBalance) return '—';
    if (newCreditsBalance) return newCreditsBalance;
    if (credit) return credit;
    return zeroCurrency;
  }, [shouldShowBlankBalance, newCreditsBalance, credit, zeroCurrency]);

  const winningsDisplay = useMemo(() => {
    if (shouldShowBlankBalance) return '—';
    if (newWinningBalance) return newWinningBalance;
    if (winnings) return winnings;
    return zeroCurrency;
  }, [shouldShowBlankBalance, newWinningBalance, winnings, zeroCurrency]);

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

  // Check if this is an "Add user" action - should show hyphen for game username
  const isAddUserAction = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === 'add_user_game' || typeStr === 'create_game';
  }, [activity.type]);

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
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
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
        {isAddUserAction ? (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            —
          </div>
        ) : gameUsername ? (
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
          {shouldShowDash ? '—' : formattedAmount}
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
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>{formattedCreatedAt}</div>
          {showUpdatedAt && (
            <div>{formattedUpdatedAt}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewClick}
            title="View activity"
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </Button>
        </div>
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

// Game Activity Card Component for Mobile
interface GameActivityCardProps {
  activity: TransactionQueue;
  onView: (activity: TransactionQueue) => void;
}

const GameActivityCard = memo(function GameActivityCard({ activity, onView }: GameActivityCardProps) {
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

  const zeroCurrency = formatCurrency('0');
  
  // Check if this is a reset or add user action - these should show hyphen for balance
  const shouldShowBlankBalance = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === 'change_password' || typeStr === 'add_user_game' || typeStr === 'create_game';
  }, [activity.type]);

  const creditsDisplay = useMemo(() => {
    if (shouldShowBlankBalance) return '—';
    if (newCreditsBalance) return newCreditsBalance;
    if (credit) return credit;
    return zeroCurrency;
  }, [shouldShowBlankBalance, newCreditsBalance, credit, zeroCurrency]);

  const winningsDisplay = useMemo(() => {
    if (shouldShowBlankBalance) return '—';
    if (newWinningBalance) return newWinningBalance;
    if (winnings) return winnings;
    return zeroCurrency;
  }, [shouldShowBlankBalance, newWinningBalance, winnings, zeroCurrency]);

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

  const gameUsername = useMemo(() => {
    if (typeof activity.game_username === 'string' && activity.game_username.trim()) {
      return activity.game_username.trim();
    }
    if (activity.data && typeof activity.data === 'object' && activity.data !== null) {
      const dataUsername = activity.data.username;
      if (typeof dataUsername === 'string' && dataUsername.trim()) {
        return dataUsername.trim();
      }
    }
    return null;
  }, [activity.game_username, activity.data]);

  // Check if this is an "Add user" action - should show hyphen for game username
  const isAddUserAction = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === 'add_user_game' || typeStr === 'create_game';
  }, [activity.type]);

  const userInitial = useMemo(() => {
    if (websiteUsername) {
      return websiteUsername.charAt(0).toUpperCase();
    }
    return activity.user_id ? String(activity.user_id).charAt(0) : '—';
  }, [websiteUsername, activity.user_id]);

  const formattedCreatedAt = useMemo(() => formatDate(activity.created_at), [activity.created_at]);

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

  const handleViewClick = useCallback(() => {
    onView(activity);
  }, [activity, onView]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Top Section: User, Activity Type & Status */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {websiteUsername || `User ${activity.user_id}`}
                </h3>
                {websiteEmail && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {websiteEmail}
                  </p>
                )}
              </div>
              <Badge variant={typeVariant} className="text-[10px] px-2 py-0.5 capitalize shrink-0">
                {typeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 capitalize">
                {activity.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Game Info */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
        {/* Game Name */}
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-4 4h2M7 20l1-4h8l1 4M6 8h12l2 4-2 4H6L4 12l2-4zM9 4h6l1 4H8l1-4z" />
          </svg>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
            {activity.game}
          </span>
        </div>

        {/* Game Username */}
        {isAddUserAction ? (
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
              —
            </span>
          </div>
        ) : gameUsername && (
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
              {gameUsername}
            </span>
          </div>
        )}
      </div>

      {/* Amount Section */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Amount</span>
          <div className="text-right">
            <div className={`text-base font-bold ${amountColorClass}`}>
              {shouldShowDash ? '—' : formattedAmount}
            </div>
            {!shouldShowDash && formattedBonus && (
              <div className={`text-xs font-semibold mt-0.5 ${bonusColorClass}`}>
                +{formattedBonus} bonus
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Balance Section */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
            <div className="text-[10px] text-blue-700 dark:text-blue-300 uppercase mb-0.5 font-medium">Credit</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {creditsDisplay}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-2">
            <div className="text-[10px] text-green-700 dark:text-green-300 uppercase mb-0.5 font-medium">Winning</div>
            <div className="text-sm font-bold text-green-600 dark:text-green-400">
              {winningsDisplay}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Date & Action */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedCreatedAt}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleViewClick}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 touch-manipulation"
          title="View activity"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="hidden sm:inline">View</span>
        </Button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activity.id === nextProps.activity.id &&
    prevProps.activity.status === nextProps.activity.status &&
    prevProps.activity.type === nextProps.activity.type &&
    prevProps.activity.amount === nextProps.activity.amount &&
    prevProps.activity.bonus_amount === nextProps.activity.bonus_amount &&
    prevProps.onView === nextProps.onView
  );
});