'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { DashboardSectionContainer } from '@/components/dashboard/layout/dashboard-section-container';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { Badge, Button, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton } from '@/components/ui';
import { ActivityDetailsModal, EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionQueuesStore } from '@/stores';
import { gamesApi, staffsApi, managersApi } from '@/lib/api';
import { storage } from '@/lib/utils/storage';
import type { TransactionQueue, Game, Staff, Manager } from '@/types';
import { HistoryGameActivitiesFilters, HistoryGameActivitiesFiltersState, QueueFilterOption } from '@/components/dashboard/history/history-game-activities-filters';


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
          <div className="divide-y divide-gray-200 dark:border-gray-700">
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
  // Map change_password back to reset_password for UI display
  const type = advanced.type === 'change_password' ? 'reset_password' : (advanced.type ?? '');
  
  return {
    username: advanced.username ?? '',
    email: advanced.email ?? '',
    transaction_id: advanced.transaction_id ?? '',
    operator: advanced.operator ?? '',
    type,
    game: advanced.game ?? '',
    game_username: advanced.game_username ?? '',
    status: advanced.status ?? '',
    date_from: advanced.date_from ?? '',
    date_to: advanced.date_to ?? '',
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Store subscriptions
  const queues = useTransactionQueuesStore((state) => state.queues);
  const isLoading = useTransactionQueuesStore((state) => state.isLoading);
  const error = useTransactionQueuesStore((state) => state.error);
  const queueFilter = useTransactionQueuesStore((state) => state.filter);
  const advancedFilters = useTransactionQueuesStore((state) => state.advancedFilters);
  const setFilter = useTransactionQueuesStore((state) => state.setFilter);
  const setFilterWithoutFetch = useTransactionQueuesStore((state) => state.setFilterWithoutFetch);
  const fetchQueues = useTransactionQueuesStore((state) => state.fetchQueues);
  const setAdvancedFiltersWithoutFetch = useTransactionQueuesStore((state) => state.setAdvancedFiltersWithoutFetch);
  const clearAdvancedFiltersWithoutFetch = useTransactionQueuesStore((state) => state.clearAdvancedFiltersWithoutFetch);
  const totalCount = useTransactionQueuesStore((state) => state.count);
  const next = useTransactionQueuesStore((state) => state.next);
  const previous = useTransactionQueuesStore((state) => state.previous);
  const currentPage = useTransactionQueuesStore((state) => state.currentPage);
  const pageSize = useTransactionQueuesStore((state) => state.pageSize);
  const setPage = useTransactionQueuesStore((state) => state.setPage);

  const [filters, setFilters] = useState<HistoryGameActivitiesFiltersState>(DEFAULT_GAME_ACTIVITY_FILTERS);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [gameOptions, setGameOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [operatorOptions, setOperatorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isOperatorLoading, setIsOperatorLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const getStoreState = useTransactionQueuesStore.getState;

  // Remove preserveFilters query parameter after reading it
  useEffect(() => {
    const preserveFilters = searchParams.get('preserveFilters');
    if (preserveFilters === 'true') {
      // Remove the parameter from URL after reading
      const params = new URLSearchParams(window.location.search);
      params.delete('preserveFilters');
      const newSearch = params.toString();
      const newUrl = newSearch
        ? `${pathname}?${newSearch}`
        : pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, pathname]);

  // Initialize - set filter to history on mount
  // Clear filters unless preserveFilters query param is present (from player details)
  useEffect(() => {
    // Only initialize once on mount
    if (hasInitializedRef.current) {
      return;
    }
    
    hasInitializedRef.current = true;
    
    // Check if we should preserve filters (from player details page)
    const shouldPreserveFilters = searchParams.get('preserveFilters') === 'true';
    
    // Read current values from store to ensure we have the latest state
    const storeState = getStoreState();
    const currentFilter = storeState.filter;
    
    // Clear filters unless they should be preserved (from player details navigation)
    if (!shouldPreserveFilters) {
      clearAdvancedFiltersWithoutFetch();
      setFilters(DEFAULT_GAME_ACTIVITY_FILTERS);
      setAreFiltersOpen(false);
    }
    
    // Always ensure filter is set to history
    if (currentFilter !== 'history') {
      setFilterWithoutFetch('history');
    }
  }, [clearAdvancedFiltersWithoutFetch, setFilterWithoutFetch, getStoreState, searchParams]);

  // Fetch on mount and when filter/advancedFilters change
  useEffect(() => {
    if (queueFilter === 'history') {
      fetchQueues();
    }
  }, [queueFilter, advancedFilters, fetchQueues]);

  // Sync filters from store
  useEffect(() => {
    const filterState = buildGameActivityFilterState(advancedFilters);

    // Format dates for HTML inputs
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

  // Lazy load games when filters are opened
  useEffect(() => {
    // Only load if filters are open, games haven't been loaded, and not currently loading
    if (!areFiltersOpen || gameOptions.length > 0 || isGameLoading) {
      return;
    }

    let isMounted = true;
    setIsGameLoading(true);

    const loadGames = async () => {
      try {
        const data = await gamesApi.list();

        if (!isMounted) return;

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

        if (isMounted) {
          setGameOptions(mappedOptions);
        }
      } catch (error) {
        console.error('Failed to load games:', error);
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
  }, [areFiltersOpen, gameOptions.length]);

  // Lazy load operators and company name when filters are opened
  useEffect(() => {
    if (!areFiltersOpen || operatorOptions.length > 0 || isOperatorLoading) {
      return;
    }

    let isMounted = true;
    let isCancelled = false;

    const loadOperators = async () => {
      if (isCancelled || !isMounted) {
        return;
      }

      setIsOperatorLoading(true);

      try {
        // Get company name from localStorage (username is the company name)
        let companyName = 'Company';
        const userData = storage.get('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user?.username) {
              companyName = user.username;
            }
          } catch (error) {
            console.warn('Failed to parse user data from localStorage:', error);
          }
        }

        // Fetch active staff
        const staffResponse = await staffsApi.list({ page_size: 100 });
        const activeStaff = (staffResponse?.results || []).filter((staff: Staff) => staff.is_active);

        // Fetch active managers
        const managersResponse = await managersApi.list({ page_size: 100 });
        const activeManagers = (managersResponse?.results || []).filter((manager: Manager) => manager.is_active);

        if (!isMounted || isCancelled) {
          return;
        }

        const operatorMap = new Map<string, { value: string; label: string }>();

        // Add "Bot" operator - use 'bot' as value, 'Bot' as label
        operatorMap.set('bot', { value: 'bot', label: 'Bot' });

        // Add "Company" - use username as both value and label
        operatorMap.set(companyName, { value: companyName, label: companyName });

        // Add active staff
        activeStaff.forEach((staff: Staff) => {
          if (staff?.username) {
            operatorMap.set(staff.username, { value: staff.username, label: staff.username });
          }
        });

        // Add active managers
        activeManagers.forEach((manager: Manager) => {
          if (manager?.username) {
            operatorMap.set(manager.username, { value: manager.username, label: manager.username });
          }
        });

        // Sort: Bot first, Company second, then alphabetically
        const sortedEntries = Array.from(operatorMap.entries()).sort((a, b) => {
          const aValue = a[1].value;
          const bValue = b[1].value;
          const aLabel = a[1].label;
          const bLabel = b[1].label;
          if (aValue === 'bot') return -1;
          if (bValue === 'bot') return 1;
          if (aValue === companyName) return -1;
          if (bValue === companyName) return 1;
          return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
        });

        const mappedOptions = sortedEntries.map(([, option]) => option);

        if (isMounted && !isCancelled) {
          setOperatorOptions(mappedOptions);
        }
      } catch (error) {
        console.error('Failed to load operators for game activity filters:', error);
      } finally {
        if (isMounted && !isCancelled) {
          setIsOperatorLoading(false);
        }
      }
    };

    loadOperators();

    return () => {
      isCancelled = true;
      isMounted = false;
    };
  }, [areFiltersOpen, operatorOptions.length]);

  const handleFilterChange = useCallback((key: keyof HistoryGameActivitiesFiltersState, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    const sanitized = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => {
        if (typeof value === 'string') {
          return value.trim() !== '';
        }
        return Boolean(value);
      })
    ) as Record<string, string>;

    // Map reset_password to change_password for query params
    if (sanitized.type === 'reset_password') {
      sanitized.type = 'change_password';
    }

    // Format dates
    if (sanitized.date_from) {
      const dateFromValue = sanitized.date_from.trim();
      if (dateFromValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateFromValue)) {
        const parsedDate = new Date(dateFromValue);
        if (!isNaN(parsedDate.getTime())) {
          sanitized.date_from = parsedDate.toISOString().split('T')[0];
        }
      }
    }

    if (sanitized.date_to) {
      const dateToValue = sanitized.date_to.trim();
      if (dateToValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateToValue)) {
        const parsedDate = new Date(dateToValue);
        if (!isNaN(parsedDate.getTime())) {
          sanitized.date_to = parsedDate.toISOString().split('T')[0];
        }
      }
    }

    setAdvancedFiltersWithoutFetch(sanitized);
  }, [filters, setAdvancedFiltersWithoutFetch]);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_GAME_ACTIVITY_FILTERS);
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

  const results = queues ?? [];
  const isInitialLoading = isLoading;
  const hasNext = Boolean(next);
  const hasPrevious = Boolean(previous);

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
        operatorOptions={operatorOptions}
        isOperatorLoading={isOperatorLoading}
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
  operatorOptions: Array<{ value: string; label: string }>;
  isOperatorLoading: boolean;
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
  operatorOptions,
  isOperatorLoading,
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
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sFm:p-3 md:p-4 lg:p-6">
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
        operatorOptions={operatorOptions}
        isOperatorLoading={isOperatorLoading}
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

function HistoryGameActivityRow({ activity, onView }: HistoryGameActivityRowProps) {
  const router = useRouter();
  const statusVariant = mapStatusToVariant(activity.status);
  const typeLabel = mapTypeToLabel(activity.type);
  const typeVariant = mapTypeToVariant(activity.type);
  const formattedAmount = formatCurrency(activity.amount);
  const isRecharge = activity.type === 'recharge_game';
  const isRedeem = activity.type === 'redeem_game';

  const amountValue = parseFloat(activity.amount || '0');
  const isZeroAmount = amountValue === 0 || isNaN(amountValue);
  const typeStr = String(activity.type);
  const isNonMonetaryType = typeStr === 'create_game' ||
    typeStr === 'reset_password' ||
    typeStr === 'change_password' ||
    typeStr === 'add_user_game';
  const shouldShowDash = isZeroAmount && isNonMonetaryType;

  const bonus = activity.bonus_amount || activity.data?.bonus_amount;
  const bonusValue = bonus ? (typeof bonus === 'string' || typeof bonus === 'number'
    ? parseFloat(String(bonus))
    : 0) : 0;
  const bonusAmount = bonusValue > 0 ? bonus : null;
  const formattedBonus = bonusAmount ? formatCurrency(String(bonusAmount)) : null;

  const creditValue = activity.data?.credit;
  const credit = creditValue !== undefined && creditValue !== null ? formatCurrency(String(creditValue)) : null;

  const winningsValue = activity.data?.winnings;
  const winnings = winningsValue !== undefined && winningsValue !== null ? formatCurrency(String(winningsValue)) : null;

  const credits = activity.data?.new_credits_balance;
  const creditsValue = credits !== undefined && credits !== null
    ? (typeof credits === 'string' || typeof credits === 'number' ? parseFloat(String(credits)) : null)
    : null;
  const newCreditsBalance = creditsValue !== null && !isNaN(creditsValue) ? formatCurrency(String(creditsValue)) : null;

  const winningsBal = activity.data?.new_winning_balance;
  const winningsBalValue = winningsBal !== undefined && winningsBal !== null
    ? (typeof winningsBal === 'string' || typeof winningsBal === 'number' ? parseFloat(String(winningsBal)) : null)
    : null;
  const newWinningBalance = winningsBalValue !== null && !isNaN(winningsBalValue) ? formatCurrency(String(winningsBalValue)) : null;

  const zeroCurrency = formatCurrency('0');
  const shouldShowBlankBalance = typeStr === 'change_password' || typeStr === 'add_user_game' || typeStr === 'create_game';

  const creditsDisplay = shouldShowBlankBalance ? '—' : (newCreditsBalance || credit || zeroCurrency);
  const winningsDisplay = shouldShowBlankBalance ? '—' : (newWinningBalance || winnings || zeroCurrency);

  const websiteUsername = typeof activity.user_username === 'string' && activity.user_username.trim()
    ? activity.user_username.trim()
    : null;

  const websiteEmail = typeof activity.user_email === 'string' && activity.user_email.trim()
    ? activity.user_email.trim()
    : null;

  const gameUsername = typeof activity.game_username === 'string' && activity.game_username.trim()
    ? activity.game_username.trim()
    : (activity.data && typeof activity.data === 'object' && activity.data !== null && typeof activity.data.username === 'string' && activity.data.username.trim()
      ? activity.data.username.trim()
      : null);

  const isAddUserAction = typeStr === 'add_user_game' || typeStr === 'create_game';

  const userInitial = websiteUsername
    ? websiteUsername.charAt(0).toUpperCase()
    : (activity.user_id ? String(activity.user_id).charAt(0) : '—');

  const formattedCreatedAt = formatDate(activity.created_at);
  const formattedUpdatedAt = formatDate(activity.updated_at);

  const handleViewClick = () => {
    onView(activity);
  };

  const handleOpenChat = useCallback(() => {
    const username = websiteUsername || `User ${activity.user_id}`;
    const chatUrl = `/dashboard/chat?playerId=${activity.user_id}&username=${encodeURIComponent(username)}`;
    router.push(chatUrl);
  }, [router, activity.user_id, websiteUsername]);

  const amountColorClass = shouldShowDash ? '' : (isRedeem ? 'text-red-600 dark:text-red-400' : (isRecharge ? 'text-green-600 dark:text-green-400' : 'text-foreground'));
  const bonusColorClass = shouldShowDash ? '' : (isRedeem ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400');

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenChat}
            className="flex-shrink-0 touch-manipulation"
            title="Open chat with this player"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
              {userInitial}
            </div>
          </button>
          <div>
            <button
              type="button"
              onClick={handleOpenChat}
              className="text-left touch-manipulation"
              title="Open chat with this player"
            >
              <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {websiteUsername || `User ${activity.user_id}`}
              </div>
            </button>
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
          <span className="text-gray-500 dark:text-gray-400 italic text-sm">New user added</span>
        ) : (
          <div className="font-medium">{gameUsername || '—'}</div>
        )}
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className={`font-semibold ${amountColorClass}`}>
            {shouldShowDash ? '—' : formattedAmount}
          </div>
          {formattedBonus && (
            <div className={`text-xs ${bonusColorClass}`}>
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
          <div>{formattedUpdatedAt}</div>
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
}

interface GameActivityCardProps {
  activity: TransactionQueue;
  onView: (activity: TransactionQueue) => void;
}

function GameActivityCard({ activity, onView }: GameActivityCardProps) {
  const router = useRouter();
  const statusVariant = mapStatusToVariant(activity.status);
  const typeLabel = mapTypeToLabel(activity.type);
  const typeVariant = mapTypeToVariant(activity.type);
  const formattedAmount = formatCurrency(activity.amount);
  const isRecharge = activity.type === 'recharge_game';
  const isRedeem = activity.type === 'redeem_game';

  const amountValue = parseFloat(activity.amount || '0');
  const isZeroAmount = amountValue === 0 || isNaN(amountValue);
  const typeStr = String(activity.type);
  const isNonMonetaryType = typeStr === 'create_game' ||
    typeStr === 'reset_password' ||
    typeStr === 'change_password' ||
    typeStr === 'add_user_game';
  const shouldShowDash = isZeroAmount && isNonMonetaryType;

  const bonus = activity.bonus_amount || activity.data?.bonus_amount;
  const bonusValue = bonus ? (typeof bonus === 'string' || typeof bonus === 'number'
    ? parseFloat(String(bonus))
    : 0) : 0;
  const bonusAmount = bonusValue > 0 ? bonus : null;
  const formattedBonus = bonusAmount ? formatCurrency(String(bonusAmount)) : null;

  const websiteUsername = typeof activity.user_username === 'string' && activity.user_username.trim()
    ? activity.user_username.trim()
    : null;

  const websiteEmail = typeof activity.user_email === 'string' && activity.user_email.trim()
    ? activity.user_email.trim()
    : null;

  const gameUsername = typeof activity.game_username === 'string' && activity.game_username.trim()
    ? activity.game_username.trim()
    : (activity.data && typeof activity.data === 'object' && activity.data !== null && typeof activity.data.username === 'string' && activity.data.username.trim()
      ? activity.data.username.trim()
      : null);

  const isAddUserAction = typeStr === 'add_user_game' || typeStr === 'create_game';

  const formattedCreatedAt = formatDate(activity.created_at);

  const handleViewClick = () => {
    onView(activity);
  };

  const handleOpenChat = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const username = websiteUsername || `User ${activity.user_id}`;
    const chatUrl = `/dashboard/chat?playerId=${activity.user_id}&username=${encodeURIComponent(username)}`;
    router.push(chatUrl);
  }, [router, activity.user_id, websiteUsername]);

  const amountColorClass = shouldShowDash ? '' : (isRedeem ? 'text-red-600 dark:text-red-400' : (isRecharge ? 'text-green-600 dark:text-green-400' : 'text-foreground'));

  return (
    <div
      className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <button
            type="button"
            onClick={handleOpenChat}
            className="text-left w-full touch-manipulation"
            title="Open chat with this player"
          >
            <div className="font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {websiteUsername || `User ${activity.user_id}`}
            </div>
          </button>
          {websiteEmail && (
            <div className="text-xs text-gray-500 dark:text-gray-400">{websiteEmail}</div>
          )}
        </div>
        <Badge variant={statusVariant} className="capitalize text-xs">
          {activity.status}
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={typeVariant} className="capitalize text-xs">
          {typeLabel}
        </Badge>
        <span className="text-sm text-gray-600 dark:text-gray-400">•</span>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.game}</span>
      </div>

      {!isAddUserAction && gameUsername && (
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400">Game Username:</span>{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">{gameUsername}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
        <div>
          <div className={`text-lg font-bold ${amountColorClass}`}>
            {shouldShowDash ? '—' : formattedAmount}
          </div>
          {formattedBonus && (
            <div className="text-xs text-green-600 dark:text-green-400">
              +{formattedBonus} bonus
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formattedCreatedAt}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function mapStatusToVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  const statusLower = status?.toLowerCase();
  if (statusLower === 'completed' || statusLower === 'complete') return 'success';
  if (statusLower === 'pending' || statusLower === 'processing') return 'warning';
  if (statusLower === 'failed' || statusLower === 'cancelled' || statusLower === 'canceled') return 'danger';
  return 'default';
}

function mapTypeToLabel(type: string): string {
  if (!type) return '—';
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game' || type === 'create_game') return 'Add User';
  if (type === 'change_password' || type === 'reset_password') return 'Reset';
  return type.replace(/_/g, ' ');
}

function mapTypeToVariant(type: string): 'default' | 'success' | 'danger' | 'info' {
  if (!type) return 'default';
  const typeLower = type.toLowerCase();
  if (typeLower === 'recharge_game') return 'success';
  if (typeLower === 'redeem_game') return 'danger';
  if (typeLower === 'add_user_game' || typeLower === 'create_game' || typeLower === 'change_password' || typeLower === 'reset_password') return 'info';
  if (typeLower.includes('recharge') || typeLower.includes('purchase')) return 'success';
  if (typeLower.includes('redeem') || typeLower.includes('cashout')) return 'danger';
  if (typeLower.includes('transfer')) return 'info';
  return 'default';
}