'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Skeleton, Pagination } from '@/components/ui';
import { useTransactionsStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { EmptyState } from '@/components/features';
import { HistoryTransactionsFilters, HistoryTransactionsFiltersState } from '@/components/dashboard/history/history-transactions-filters';
import { agentsApi, paymentMethodsApi, staffsApi, managersApi } from '@/lib/api';
import type { Agent, PaymentMethod, Staff, Manager } from '@/types';

const DEFAULT_HISTORY_FILTERS: HistoryTransactionsFiltersState = {
  agent: '',
  agent_id: '',
  username: '',
  email: '',
  transaction_id: '',
  operator: '',
  type: '',
  payment_method: '',
  status: '',
  game: '',
  date_from: '',
  date_to: '',
  amount_min: '',
  amount_max: '',
};

function buildHistoryFilterState(advanced: Record<string, string>): HistoryTransactionsFiltersState {
  const txn = advanced.txn ?? '';
  const derivedType =
    txn === 'purchases'
      ? 'purchase'
      : txn === 'cashouts'
        ? 'cashout'
        : advanced.type ?? '';

  return {
    agent: advanced.agent ?? '',
    agent_id: advanced.agent_id ?? '',
    username: advanced.username ?? '',
    email: advanced.email ?? '',
    transaction_id: advanced.transaction_id ?? '',
    operator: advanced.operator ?? '',
    type: derivedType,
    payment_method: advanced.payment_method ?? '',
    status: advanced.status ?? '',
    game: advanced.game ?? '',
    date_from: advanced.date_from ?? '',
    date_to: advanced.date_to ?? '',
    amount_min: advanced.amount_min ?? '',
    amount_max: advanced.amount_max ?? '',
  };
}

export function SuperAdminHistoryTransactions() {
    const transactions = useTransactionsStore((state) => state.transactions);
    const isLoading = useTransactionsStore((state) => state.isLoading);
    const error = useTransactionsStore((state) => state.error);
    const currentPage = useTransactionsStore((state) => state.currentPage);
    const pageSize = useTransactionsStore((state) => state.pageSize);
    const filter = useTransactionsStore((state) => state.filter);
    const advancedFilters = useTransactionsStore((state) => state.advancedFilters);
    const setFilter = useTransactionsStore((state) => state.setFilter);
    const setPage = useTransactionsStore((state) => state.setPage);
    const fetchTransactions = useTransactionsStore((state) => state.fetchTransactions);
    const setAdvancedFiltersWithoutFetch = useTransactionsStore((state) => state.setAdvancedFiltersWithoutFetch);

    const [filters, setFilters] = useState<HistoryTransactionsFiltersState>(() => buildHistoryFilterState(advancedFilters));
    const [areFiltersOpen, setAreFiltersOpen] = useState(false);
    const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [agentIdMap, setAgentIdMap] = useState<Map<string, number>>(new Map());
    const [isAgentLoading, setIsAgentLoading] = useState(false);
    const [paymentMethodOptions, setPaymentMethodOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [isPaymentMethodLoading, setIsPaymentMethodLoading] = useState(false);
    const [operatorOptions, setOperatorOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [isOperatorLoading, setIsOperatorLoading] = useState(false);

    // Initialize filter once
    useEffect(() => {
        setFilter('history');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch transactions when dependencies change
    useEffect(() => {
        if (filter === 'history') {
            fetchTransactions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, filter, JSON.stringify(advancedFilters)]);

    // Sync filters with advanced filters
    useEffect(() => {
        const filterState = buildHistoryFilterState(advancedFilters);
        
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

    // Fetch agents for dropdown
    useEffect(() => {
        let isMounted = true;

        const loadAgents = async () => {
            setIsAgentLoading(true);

            try {
                const aggregated: Agent[] = [];
                const pageSize = 100;
                let page = 1;
                let hasNext = true;

                while (hasNext) {
                    const response = await agentsApi.list({ page, page_size: pageSize });

                    if (!response?.results) {
                        break;
                    }

                    aggregated.push(...response.results);

                    if (!response.next) {
                        hasNext = false;
                    } else {
                        page += 1;
                    }
                }

                if (!isMounted) {
                    return;
                }

                const uniqueAgents = new Map<string, string>();
                const idMap = new Map<string, number>();

                aggregated.forEach((agent) => {
                    if (agent?.username) {
                        uniqueAgents.set(agent.username, agent.username);
                        idMap.set(agent.username, agent.id);
                    }
                });

                const mappedOptions = Array.from(uniqueAgents.entries())
                    .map(([value, label]) => ({ value, label }))
                    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

                setAgentOptions(mappedOptions);
                setAgentIdMap(idMap);
            } catch (error) {
                console.error('Failed to load agents for transaction filters:', error);
            } finally {
                if (isMounted) {
                    setIsAgentLoading(false);
                }
            }
        };

        loadAgents();

        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch payment methods for dropdown
    useEffect(() => {
        let isMounted = true;

        const loadPaymentMethods = async () => {
            setIsPaymentMethodLoading(true);

            try {
                const data = await paymentMethodsApi.list();
                const methods = Array.isArray(data) 
                    ? data 
                    : (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results))
                        ? data.results
                        : [];

                if (!isMounted) {
                    return;
                }

                const uniqueMethods = new Map<string, string>();

                methods.forEach((method: PaymentMethod) => {
                    if (method?.payment_method) {
                        uniqueMethods.set(method.payment_method, method.payment_method_display || method.payment_method);
                    }
                });

                const mappedOptions = Array.from(uniqueMethods.entries())
                    .map(([value, label]) => ({ value, label }))
                    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

                setPaymentMethodOptions(mappedOptions);
            } catch (error) {
                console.error('Failed to load payment methods for transaction filters:', error);
            } finally {
                if (isMounted) {
                    setIsPaymentMethodLoading(false);
                }
            }
        };

        loadPaymentMethods();

        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch operators (staffs + managers) for dropdown
    useEffect(() => {
        let isMounted = true;

        const loadOperators = async () => {
            setIsOperatorLoading(true);

            try {
                const [staffsData, managersData] = await Promise.all([
                    staffsApi.list(),
                    managersApi.list(),
                ]);

                if (!isMounted) {
                    return;
                }

                const staffs = Array.isArray(staffsData) 
                    ? staffsData 
                    : (staffsData && typeof staffsData === 'object' && 'results' in staffsData && Array.isArray(staffsData.results))
                        ? staffsData.results
                        : [];

                const managers = Array.isArray(managersData) 
                    ? managersData 
                    : (managersData && typeof managersData === 'object' && 'results' in managersData && Array.isArray(managersData.results))
                        ? managersData.results
                        : [];

                const uniqueOperators = new Map<string, string>();

                [...staffs, ...managers].forEach((operator: Staff | Manager) => {
                    if (operator?.username) {
                        uniqueOperators.set(operator.username, operator.username);
                    }
                });

                const mappedOptions = Array.from(uniqueOperators.entries())
                    .map(([value, label]) => ({ value, label }))
                    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

                setOperatorOptions(mappedOptions);
            } catch (error) {
                console.error('Failed to load operators for transaction filters:', error);
            } finally {
                if (isMounted) {
                    setIsOperatorLoading(false);
                }
            }
        };

        loadOperators();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleFilterChange = useCallback((key: keyof HistoryTransactionsFiltersState, value: string) => {
        setFilters((previous) => ({ ...previous, [key]: value }));
    }, []);

    const handleApplyFilters = useCallback(() => {
        // Sanitize filters - keep only non-empty values
        const sanitized = Object.fromEntries(
            Object.entries(filters).filter(([key, value]) => {
                if (key === 'game') return false; // Remove game filter as it's not used for transactions
                if (typeof value === 'string') {
                    return value.trim() !== '';
                }
                return Boolean(value);
            })
        ) as Record<string, string>;

        // Handle agent_id conversion
        if (sanitized.agent && !sanitized.agent_id && agentIdMap.size > 0) {
            const agentId = agentIdMap.get(sanitized.agent);
            if (agentId) {
                sanitized.agent_id = String(agentId);
            }
        }

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
    }, [filters, setAdvancedFiltersWithoutFetch, agentIdMap]);

    const handleClearFilters = useCallback(() => {
        setFilters({ ...DEFAULT_HISTORY_FILTERS });
        // Use setAdvancedFiltersWithoutFetch to prevent duplicate API calls
        // The useEffect will handle fetching with cleared filters
        setAdvancedFiltersWithoutFetch({});
    }, [setAdvancedFiltersWithoutFetch]);

    const handleToggleFilters = useCallback(() => {
        setAreFiltersOpen((previous) => !previous);
    }, []);

    const handlePageChange = useCallback((page: number) => {
        setPage(page);
    }, [setPage]);

    // Calculate stats from actual data
    const stats = useMemo(() => {
        const results = transactions?.results || [];
        
        const totalTransactions = results.length;
        const completed = results.filter(t => t.status === 'completed').length;
        const pending = results.filter(t => t.status === 'pending').length;
        const totalVolume = results.reduce((sum, t) => {
            const amount = parseFloat(t.amount || '0');
            return sum + amount;
        }, 0);

        return {
            totalTransactions,
            completed,
            pending,
            totalVolume,
        };
    }, [transactions]);

    const transactionList = transactions?.results || [];

    if (isLoading && !transactionList.length) {
        return (
            <div className="md:pb-0 pb-6 -mx-4 md:mx-0 px-2 md:px-0">
                <div className="sticky top-0 z-10 md:relative md:top-auto md:z-auto bg-background/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 mb-4 md:mb-6 -mx-4 md:mx-0 px-2 md:px-0 py-3 md:py-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Transaction History</h1>
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
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Transaction History</h1>
                </div>
                <Card className="p-6">
                    <div className="text-center text-red-600 dark:text-red-400">
                        <p className="font-semibold">Error loading transactions</p>
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
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Transaction History</h1>
            </div>

            {/* Transaction Stats - Compact Mobile Design */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 mb-0.5 md:mb-1">Total</div>
                                <div className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalTransactions}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 mb-0.5 md:mb-1">Completed</div>
                                <div className="text-xl md:text-3xl font-bold text-green-900 dark:text-green-100">{stats.completed}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-green-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10 border-yellow-200 dark:border-yellow-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-0.5 md:mb-1">Pending</div>
                                <div className="text-xl md:text-3xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pending}</div>
                            </div>
                            <div className="p-2 md:p-3 bg-yellow-500/10 rounded-lg md:rounded-xl w-fit">
                                <svg className="w-5 h-5 md:w-8 md:h-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800 shadow-sm md:shadow-md rounded-xl md:rounded-lg overflow-hidden">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                            <div className="flex-1">
                                <div className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300 mb-0.5 md:mb-1">Volume</div>
                                <div className="text-xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                                    {formatCurrency(String(stats.totalVolume))}
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
            </div>

            {/* Filters */}
            <HistoryTransactionsFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
                isOpen={areFiltersOpen}
                onToggle={handleToggleFilters}
                agentOptions={agentOptions}
                isAgentLoading={isAgentLoading}
                paymentMethodOptions={paymentMethodOptions}
                isPaymentMethodLoading={isPaymentMethodLoading}
                operatorOptions={operatorOptions}
                isOperatorLoading={isOperatorLoading}
                isLoading={isLoading}
            />

            {/* Transactions Table */}
            <Card className="shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
                <CardHeader className="pb-3 md:pb-6 px-2 md:px-6 pt-3 md:pt-6 border-b md:border-b-0">
                    <h2 className="text-base md:text-lg font-semibold">Recent Transactions</h2>
                </CardHeader>
                <CardContent className="p-0">
                    {transactionList.length === 0 ? (
                        <div className="py-12">
                            <EmptyState 
                                title="No transactions found" 
                                description="No completed or cancelled transactions found"
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
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactionList.map((transaction) => {
                                            const username = transaction.user_username || `User ${transaction.id}`;
                                            const transactionType = transaction.type || '—';
                                            
                                            return (
                                                <TableRow key={transaction.id}>
                                                    <TableCell className="font-medium">{username}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="info" className="capitalize">
                                                            {transactionType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-semibold">
                                                        {formatCurrency(transaction.amount || '0')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                transaction.status === 'completed' ? 'success' :
                                                                transaction.status === 'pending' ? 'warning' :
                                                                transaction.status === 'failed' ? 'danger' : 'default'
                                                            }
                                                            className="capitalize"
                                                        >
                                                            {transaction.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatDate(transaction.created_at || transaction.created)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-2 px-2 pb-3">
                                {transactionList.map((transaction) => {
                                    const username = transaction.user_username || `User ${transaction.id}`;
                                    const transactionType = transaction.type || '—';
                                    
                                    return (
                                        <Card 
                                            key={transaction.id} 
                                            className="border shadow-md hover:shadow-lg transition-shadow active:scale-[0.99] rounded-2xl overflow-hidden bg-card"
                                        >
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-base leading-tight mb-1">{username}</h3>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge 
                                                                variant={
                                                                    transaction.status === 'completed' ? 'success' :
                                                                    transaction.status === 'pending' ? 'warning' :
                                                                    transaction.status === 'failed' ? 'danger' : 'default'
                                                                }
                                                                className="text-xs px-2 py-0.5 capitalize"
                                                            >
                                                                {transaction.status}
                                                            </Badge>
                                                            <Badge variant="info" className="text-xs px-2 py-0.5 capitalize">
                                                                {transactionType}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm pt-2 border-t">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-muted-foreground">Amount:</span>
                                                        <span className="font-semibold">{formatCurrency(transaction.amount || '0')}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-muted-foreground">Date:</span>
                                                        <span className="text-xs text-muted-foreground">{formatDate(transaction.created_at || transaction.created)}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {(() => {
                                const totalCount = transactions?.count || 0;
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
                                            hasNext={Boolean(transactions?.next)}
                                            hasPrevious={Boolean(transactions?.previous)}
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
