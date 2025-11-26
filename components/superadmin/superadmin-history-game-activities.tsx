'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Skeleton, Pagination } from '@/components/ui';
import { useTransactionQueuesStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { EmptyState } from '@/components/features';
import { HistoryGameActivitiesFilters, HistoryGameActivitiesFiltersState, QueueFilterOption } from '@/components/dashboard/history/history-game-activities-filters';
import { gamesApi } from '@/lib/api';
import type { Game } from '@/types';

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

export function SuperAdminHistoryGameActivities() {
    const queues = useTransactionQueuesStore((state) => state.queues);
    const isLoading = useTransactionQueuesStore((state) => state.isLoading);
    const error = useTransactionQueuesStore((state) => state.error);
    const queueFilter = useTransactionQueuesStore((state) => state.filter);
    const advancedFilters = useTransactionQueuesStore((state) => state.advancedFilters);
    const setFilter = useTransactionQueuesStore((state) => state.setFilter);
    const fetchQueues = useTransactionQueuesStore((state) => state.fetchQueues);
    const setAdvancedFiltersWithoutFetch = useTransactionQueuesStore((state) => state.setAdvancedFiltersWithoutFetch);
    const totalCount = useTransactionQueuesStore((state) => state.count);
    const next = useTransactionQueuesStore((state) => state.next);
    const previous = useTransactionQueuesStore((state) => state.previous);
    const currentPage = useTransactionQueuesStore((state) => state.currentPage);
    const pageSize = useTransactionQueuesStore((state) => state.pageSize);
    const setPage = useTransactionQueuesStore((state) => state.setPage);

    const [filters, setFilters] = useState<HistoryGameActivitiesFiltersState>(() => buildGameActivityFilterState(advancedFilters));
    const [areFiltersOpen, setAreFiltersOpen] = useState(false);
    const [gameOptions, setGameOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [isGameLoading, setIsGameLoading] = useState(false);

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
        // setPage is async but Pagination expects synchronous callback
        // Handle promise to prevent race conditions and catch errors
        setPage(page).catch((error) => {
            console.error('Failed to change page:', error);
        });
    }, [setPage]);

    // Calculate stats from actual data
    const stats = useMemo(() => {
        if (!queues || queues.length === 0) {
            return {
                totalActivities: 0,
                totalBets: 0,
                totalWins: 0,
                netProfit: 0,
            };
        }

        let totalBets = 0;
        let totalWins = 0;

        queues.forEach((activity) => {
            const amount = parseFloat(activity.amount || '0');
            if (activity.type === 'recharge_game') {
                totalBets += amount;
            } else if (activity.type === 'redeem_game') {
                totalWins += amount;
            }
        });

        const netProfit = totalBets - totalWins;

        return {
            totalActivities: queues.length,
            totalBets,
            totalWins,
            netProfit,
        };
    }, [queues]);

    const activities = queues || [];

    if (isLoading && !activities.length) {
        return (
            <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
                <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Game Activity History</h1>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
                <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Game Activity History</h1>
                </div>
                <Card className="p-6">
                    <div className="text-center text-red-600 dark:text-red-400">
                        <p className="font-semibold">Error loading game activities</p>
                        <p className="text-sm mt-2">{error}</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
            {/* Sticky Mobile Header */}
            <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Game Activity History</h1>
            </div>

            {/* Activity Stats - Compact Mobile Design */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 mb-0.5 md:mb-1">Activities</div>
                                <div className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalActivities}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300 mb-0.5 md:mb-1">Bets</div>
                                <div className="text-xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                                    {formatCurrency(String(stats.totalBets))}
                                </div>
                            </div>
                            <div className="p-2 md:p-3 bg-purple-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 mb-0.5 md:mb-1">Wins</div>
                                <div className="text-xl md:text-3xl font-bold text-green-900 dark:text-green-100">
                                    {formatCurrency(String(stats.totalWins))}
                                </div>
                            </div>
                            <div className="p-2 md:p-3 bg-green-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={`bg-gradient-to-br shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden ${
                    stats.netProfit >= 0 
                        ? 'from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800'
                        : 'from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-800'
                }`}>
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className={`text-xs md:text-sm font-medium mb-0.5 md:mb-1 ${
                                    stats.netProfit >= 0 
                                        ? 'text-green-700 dark:text-green-300' 
                                        : 'text-red-700 dark:text-red-300'
                                }`}>Profit</div>
                                <div className={`text-xl md:text-3xl font-bold ${
                                    stats.netProfit >= 0 
                                        ? 'text-green-900 dark:text-green-100' 
                                        : 'text-red-900 dark:text-red-100'
                                }`}>
                                    {formatCurrency(String(stats.netProfit))}
                                </div>
                            </div>
                            <div className={`p-2 md:p-3 rounded-lg md:rounded-xl w-fit ${
                                stats.netProfit >= 0 
                                    ? 'bg-green-500/10' 
                                    : 'bg-red-500/10'
                            }`}>
                                <svg className={`w-5 h-5 md:w-8 md:h-8 ${
                                    stats.netProfit >= 0 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-red-600 dark:text-red-400'
                                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <HistoryGameActivitiesFilters
                queueFilter={queueFilter as QueueFilterOption}
                onQueueFilterChange={handleQueueFilterChange}
                filters={filters}
                onFilterChange={handleFilterChange}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
                isOpen={areFiltersOpen}
                onToggle={handleToggleFilters}
                gameOptions={gameOptions}
                isGameLoading={isGameLoading}
                isLoading={isLoading}
            />

            {/* Game Activities Table */}
            <Card className="mt-4 md:mt-6 shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                <CardHeader className="pb-3 md:pb-6 px-2 md:px-6 pt-3 md:pt-6 border-b md:border-b-0">
                    <h2 className="text-base md:text-lg font-semibold">Recent Game Activities</h2>
                </CardHeader>
                <CardContent className="p-0">
                    {activities.length === 0 ? (
                        <div className="py-12">
                            <EmptyState 
                                title="No game activity history" 
                                description="No completed or cancelled game activities found"
                            />
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Username</TableHead>
                                            <TableHead>Game</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activities.map((activity) => {
                                            const username = activity.user_username || `User ${activity.user_id}`;
                                            const amount = parseFloat(activity.amount || '0');
                                            const isRecharge = activity.type === 'recharge_game';
                                            const isRedeem = activity.type === 'redeem_game';
                                            
                                            return (
                                                <TableRow key={activity.id}>
                                                    <TableCell className="font-medium">{username}</TableCell>
                                                    <TableCell>{activity.game || '—'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={isRecharge ? 'success' : isRedeem ? 'danger' : 'info'} className="capitalize">
                                                            {isRecharge ? 'Recharge' : isRedeem ? 'Redeem' : activity.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className={isRecharge ? 'text-green-600 font-semibold' : isRedeem ? 'text-red-600 font-semibold' : ''}>
                                                        {formatCurrency(activity.amount || '0')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            variant={
                                                                activity.status === 'completed' ? 'success' :
                                                                activity.status === 'pending' ? 'warning' :
                                                                activity.status === 'failed' ? 'danger' : 'default'
                                                            }
                                                            className="capitalize"
                                                        >
                                                            {activity.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatDate(activity.created_at || (activity as any).created || '')}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-2 px-2 pb-3">
                                {activities.map((activity) => {
                                    const username = activity.user_username || `User ${activity.user_id}`;
                                    const isRecharge = activity.type === 'recharge_game';
                                    const isRedeem = activity.type === 'redeem_game';
                                    
                                    return (
                                        <Card 
                                            key={activity.id} 
                                            className="border shadow-md hover:shadow-lg transition-shadow active:scale-[0.99] rounded-2xl overflow-hidden bg-card"
                                        >
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-base leading-tight mb-1">{username}</h3>
                                                        <p className="text-xs text-muted-foreground mb-2">{activity.game || '—'}</p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge 
                                                                variant={isRecharge ? 'success' : isRedeem ? 'danger' : 'info'} 
                                                                className="text-xs px-2 py-0.5 capitalize"
                                                            >
                                                                {isRecharge ? 'Recharge' : isRedeem ? 'Redeem' : activity.type}
                                                            </Badge>
                                                            <Badge 
                                                                variant={
                                                                    activity.status === 'completed' ? 'success' :
                                                                    activity.status === 'pending' ? 'warning' :
                                                                    activity.status === 'failed' ? 'danger' : 'default'
                                                                }
                                                                className="text-xs px-2 py-0.5 capitalize"
                                                            >
                                                                {activity.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm pt-2 border-t">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-muted-foreground">Amount:</span>
                                                        <span className={`font-semibold ${isRecharge ? 'text-green-600' : isRedeem ? 'text-red-600' : ''}`}>
                                                            {formatCurrency(activity.amount || '0')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-muted-foreground">Date:</span>
                                                        <span className="text-xs text-muted-foreground">{formatDate(activity.created_at || (activity as any).created || '')}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {(() => {
                                const totalPages = pageSize > 0
                                    ? Math.max(1, Math.ceil(totalCount / pageSize))
                                    : 1;
                                // Only show pagination if there's more than one page
                                const shouldShowPagination = totalPages > 1;

                                return shouldShowPagination ? (
                                    <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            hasNext={Boolean(next)}
                                            hasPrevious={Boolean(previous)}
                                            onPageChange={handlePageChange}
                                        />
                                    </div>
                                ) : null;
                            })()}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
