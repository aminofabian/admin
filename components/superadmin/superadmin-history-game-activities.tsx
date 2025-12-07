'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardSectionContainer } from '@/components/dashboard/layout';
import { Badge, Button, Card, CardContent, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton } from '@/components/ui';
import { ActivityDetailsModal, EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionQueuesStore } from '@/stores';
import { gamesApi, paymentMethodsApi, staffsApi, managersApi, agentsApi } from '@/lib/api';
import type { TransactionQueue, Game, Company, Staff, Manager, Agent, PaymentMethod } from '@/types';
import { HistoryGameActivitiesFilters, HistoryGameActivitiesFiltersState, QueueFilterOption } from '@/components/dashboard/history/history-game-activities-filters';

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
    const [operatorOptions, setOperatorOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [isOperatorLoading, setIsOperatorLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [agentIdMap, setAgentIdMap] = useState<Map<string, number>>(new Map());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isAgentLoading, setIsAgentLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [paymentMethodOptions, setPaymentMethodOptions] = useState<Array<{ value: string; label: string }>>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isPaymentMethodLoading, setIsPaymentMethodLoading] = useState(false);

    // Company filter state
    const [companySearchTerm, setCompanySearchTerm] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

    // Initialize filter once and clear any previous filters
    useEffect(() => {
        // Clear filters on mount (page reload scenario)
        setAdvancedFiltersWithoutFetch({});
        setFilter('history');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch companies
    useEffect(() => {
        fetchCompanies();
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

        // Sync selected company from filters
        if (advancedFilters.company_id) {
            const companyId = parseInt(advancedFilters.company_id, 10);
            if (!isNaN(companyId)) {
                setSelectedCompanyId(companyId);
            }
        } else {
            setSelectedCompanyId(null);
        }

        if (Object.keys(advancedFilters).length > 0) {
            setAreFiltersOpen(true);
        }
    }, [advancedFilters]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isCompanyDropdownOpen && !target.closest('[data-company-dropdown]')) {
                setIsCompanyDropdownOpen(false);
                setCompanySearchTerm('');
            }
        };

        if (isCompanyDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isCompanyDropdownOpen]);

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
                console.error('Failed to load agents for game activity filters:', error);
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
                console.error('Failed to load payment methods for game activity filters:', error);
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

    // Fetch operators (staffs, managers) for dropdown
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

                const operatorMap = new Map<string, string>();

                // Add active staff
                staffs
                    .filter((staff: Staff) => staff.is_active)
                    .forEach((staff: Staff) => {
                        if (staff?.username) {
                            operatorMap.set(staff.username, staff.username);
                        }
                    });

                // Add active managers
                managers
                    .filter((manager: Manager) => manager.is_active)
                    .forEach((manager: Manager) => {
                        if (manager?.username) {
                            operatorMap.set(manager.username, manager.username);
                        }
                    });

                const mappedOptions = Array.from(operatorMap.entries())
                    .map(([value, label]) => ({ value, label }))
                    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

                if (isMounted) {
                    setOperatorOptions(mappedOptions);
                }
            } catch (error) {
                console.error('Failed to load operators for game activity filters:', error);
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

    const fetchCompanies = async () => {
        setIsLoadingCompanies(true);
        try {
            const response = await paymentMethodsApi.getManagementCompanies();
            if (response.companies) {
                console.log('🏢 Companies loaded:', {
                    count: response.companies.length,
                    companies: response.companies.map(c => ({ id: c.id, username: c.username, project_name: c.project_name })),
                });
                setCompanies(response.companies);
            } else {
                console.warn('⚠️ No companies in response:', response);
                setCompanies([]);
            }
        } catch (err: unknown) {
            console.error('Failed to load companies:', err);
            setCompanies([]);
        } finally {
            setIsLoadingCompanies(false);
        }
    };

    const handleFilterChange = useCallback((key: keyof HistoryGameActivitiesFiltersState, value: string) => {
        setFilters((previous) => ({ ...previous, [key]: value }));
    }, []);

    const handleCompanyChange = useCallback((companyId: number | null) => {
        setSelectedCompanyId(companyId);
        // Update advanced filters with company_id
        const updatedFilters = { ...advancedFilters };
        if (companyId) {
            updatedFilters.company_id = String(companyId);
        } else {
            delete updatedFilters.company_id;
        }
        setAdvancedFiltersWithoutFetch(updatedFilters);
    }, [advancedFilters, setAdvancedFiltersWithoutFetch]);

    const handleApplyFilters = useCallback(() => {
        // Sanitize filters - keep only non-empty values
        const sanitized = Object.fromEntries(
            Object.entries(filters).filter(([, value]) => {
                if (typeof value === 'string') {
                    return value.trim() !== '';
                }
                return Boolean(value);
            })
        ) as Record<string, string>;

        // Add company_id if selected
        if (selectedCompanyId) {
            sanitized.company_id = String(selectedCompanyId);
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
    }, [filters, selectedCompanyId, setAdvancedFiltersWithoutFetch]);

    const handleClearFilters = useCallback(() => {
        setFilters({ ...DEFAULT_GAME_ACTIVITY_FILTERS });
        setSelectedCompanyId(null);
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

    const filteredCompanies = useMemo(() => {
        if (!companySearchTerm.trim()) return companies;

        const search = companySearchTerm.toLowerCase();
        return companies.filter(
            (company) =>
                company.project_name.toLowerCase().includes(search) ||
                company.username.toLowerCase().includes(search)
        );
    }, [companies, companySearchTerm]);

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    // Create a map of companies by username for quick lookup
    const companyMapByUsername = useMemo(() => {
        const map = new Map<string, Company>();
        companies.forEach(company => {
            if (company.username) {
                map.set(company.username, company);
            }
        });
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development' && companies.length > 0) {
            console.log('🏢 Company map created:', {
                companiesCount: companies.length,
                mapSize: map.size,
                mapKeys: Array.from(map.keys()),
                sampleCompany: companies[0],
            });
        }
        
        return map;
    }, [companies]);

    const results = useMemo(() => queues ?? [], [queues]);
    const isInitialLoading = useMemo(() => isLoading, [isLoading]);
    const hasNext = useMemo(() => Boolean(next), [next]);
    const hasPrevious = useMemo(() => Boolean(previous), [previous]);

    const totalPages = pageSize > 0
        ? Math.max(1, Math.ceil(totalCount / pageSize))
        : 1;

    const shouldShowPagination = totalCount > pageSize || hasNext || hasPrevious;

    const GAME_ACTIVITIES_SKELETON = (
        <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
                <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
                    <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
                    <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-48 shrink-0" />
                    <div className="flex-1 min-w-0" />
                </div>
            </div>
            <Skeleton className="h-32 w-full" />
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
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-full">
                        <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-10 gap-4 px-4 py-3">
                                {[...Array(10)].map((_, i) => (
                                    <Skeleton key={i} className="h-4 w-24" />
                                ))}
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="grid grid-cols-10 gap-4 px-4 py-4">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-5 w-24" />
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

    const handleFetchQueues = useCallback(() => {
        fetchQueues();
    }, [fetchQueues]);

    return (
        <DashboardSectionContainer
            isLoading={isInitialLoading && !results.length}
            error={error ?? ''}
            onRetry={handleFetchQueues}
            isEmpty={false}
            emptyState={null}
            loadingState={GAME_ACTIVITIES_SKELETON}
        >
            {/* Header */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
                <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-4 4h2M7 20l1-4h8l1 4M6 8h12l2 4-2 4H6L4 12l2-4zM9 4h6l1 4H8l1-4z" />
                        </svg>
                    </div>
                    <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                        Game Activity History
                    </h2>
                    <div className="flex-1 min-w-0" />
                </div>
            </div>

            {/* Company Filter - Hidden for now */}
            {false && (
            <Card className="mt-4 mb-4 shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-visible">
                <CardContent className="px-4 md:px-6 py-4 md:py-6">
                    <div className="relative" data-company-dropdown>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Filter by Company
                        </label>
                        <button
                            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                            className="w-full p-3 rounded-lg border-2 border-border bg-card hover:border-primary/50 hover:bg-accent transition-all text-left group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-lg flex items-center justify-center shadow-sm border border-primary/10">
                                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {selectedCompany ? (
                                            <>
                                                <div className="font-semibold text-sm text-foreground truncate">
                                                    {selectedCompany?.project_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    @{selectedCompany?.username}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-sm text-muted-foreground">
                                                All Companies
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-3">
                                    <svg
                                        className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isCompanyDropdownOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isCompanyDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-card border-2 border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Search Input */}
                                <div className="p-3 border-b border-border bg-muted/30">
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={companySearchTerm}
                                            onChange={(e) => setCompanySearchTerm(e.target.value)}
                                            placeholder="Search companies..."
                                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>

                                {/* Company List */}
                                <div className="max-h-[300px] overflow-y-auto">
                                    <button
                                        onClick={() => {
                                            handleCompanyChange(null);
                                            setIsCompanyDropdownOpen(false);
                                            setCompanySearchTerm('');
                                        }}
                                        className={`w-full p-3 text-left transition-all hover:bg-accent border-b border-border/50 ${!selectedCompanyId ? 'bg-primary/5' : ''}`}
                                    >
                                        <div className="font-semibold text-sm">All Companies</div>
                                    </button>
                                    {filteredCompanies.length === 0 ? (
                                        <div className="p-6 text-center text-muted-foreground">
                                            <p className="text-sm">No companies match your search</p>
                                        </div>
                                    ) : (
                                        filteredCompanies.map((company) => (
                                            <button
                                                key={company.id}
                                                onClick={() => {
                                                    handleCompanyChange(company.id);
                                                    setIsCompanyDropdownOpen(false);
                                                    setCompanySearchTerm('');
                                                }}
                                                className={`w-full p-3 text-left transition-all hover:bg-accent border-b border-border/50 last:border-b-0 ${selectedCompanyId === company.id ? 'bg-primary/5' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${selectedCompanyId === company.id
                                                        ? 'bg-primary text-primary-foreground shadow-md'
                                                        : 'bg-gradient-to-br from-muted to-muted/50 text-muted-foreground'
                                                        }`}>
                                                        {company.project_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-sm text-foreground truncate">
                                                            {company.project_name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            @{company.username}
                                                        </div>
                                                    </div>
                                                    {selectedCompanyId === company.id && (
                                                        <div className="flex-shrink-0">
                                                            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            )}

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
                operatorOptions={[]}
                isOperatorLoading={false}
                isLoading={isLoading}
            />

            <HistoryGameActivitiesTable
                queues={results}
                pagination={{
                    totalCount,
                    pageSize,
                    currentPage,
                    hasNext,
                    hasPrevious,
                    onPageChange: handlePageChange,
                }}
                totalPages={totalPages}
                shouldShowPagination={shouldShowPagination}
                companyMapByUsername={companyMapByUsername}
            />
        </DashboardSectionContainer>
    );
}

interface HistoryPaginationState {
    totalCount: number;
    pageSize: number;
    currentPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
    onPageChange: (page: number) => void;
}

interface HistoryGameActivitiesTableProps {
    queues: TransactionQueue[];
    pagination: HistoryPaginationState;
    totalPages: number;
    shouldShowPagination: boolean;
    companyMapByUsername: Map<string, Company>;
}

function HistoryGameActivitiesTable({
    queues,
    pagination,
    totalPages,
    shouldShowPagination,
    companyMapByUsername
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
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                                    companyMapByUsername={companyMapByUsername}
                                />
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Company</TableHead>
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
                                        <HistoryGameActivityRow
                                            key={activity.id}
                                            activity={activity}
                                            onView={handleViewActivity}
                                            companyMapByUsername={companyMapByUsername}
                                        />
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
    companyMapByUsername: Map<string, Company>;
}

const HistoryGameActivityRow = memo(function HistoryGameActivityRow({ activity, onView, companyMapByUsername }: HistoryGameActivityRowProps) {
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
                {(() => {
                    // Debug logging to help troubleshoot
                    if (process.env.NODE_ENV === 'development' && activity.company_username) {
                        const found = companyMapByUsername.get(activity.company_username);
                        if (!found) {
                            console.log('🔍 Company lookup failed:', {
                                company_username: activity.company_username,
                                company_id: activity.company_id,
                                mapSize: companyMapByUsername.size,
                                mapKeys: Array.from(companyMapByUsername.keys()),
                            });
                        }
                    }
                    
                    const activityCompany = activity.company_username 
                        ? companyMapByUsername.get(activity.company_username)
                        : null;
                    
                    if (activityCompany) {
                        return (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center font-bold text-xs text-primary">
                                    {activityCompany.project_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {activityCompany.project_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        @{activityCompany.username}
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    
                    // Fallback: show company_username if available, even if not in map
                    if (activity.company_username) {
                        return (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center font-bold text-xs text-muted-foreground">
                                    {activity.company_username.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium text-sm truncate text-muted-foreground">
                                        {activity.company_username}
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    
                    return <div className="text-gray-500 dark:text-gray-400">—</div>;
                })()}
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
    return (
        prevProps.activity.id === nextProps.activity.id &&
        prevProps.activity.status === nextProps.activity.status &&
        prevProps.activity.type === nextProps.activity.type &&
        prevProps.activity.amount === nextProps.activity.amount &&
        prevProps.activity.bonus_amount === nextProps.activity.bonus_amount &&
        prevProps.activity.operator === nextProps.activity.operator &&
        prevProps.activity.user_email === nextProps.activity.user_email &&
        prevProps.activity.updated_at === nextProps.activity.updated_at &&
        prevProps.activity.company_username === nextProps.activity.company_username &&
        prevProps.onView === nextProps.onView
    );
});

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
    if (type === 'recharge_game') return 'success';
    if (type === 'redeem_game') return 'danger';
    return 'info';
};

interface GameActivityCardProps {
    activity: TransactionQueue;
    onView: (activity: TransactionQueue) => void;
    companyMapByUsername: Map<string, Company>;
}

const GameActivityCard = memo(function GameActivityCard({ activity, onView, companyMapByUsername }: GameActivityCardProps) {
    const statusVariant = useMemo(() => mapStatusToVariant(activity.status), [activity.status]);
    const typeLabel = useMemo(() => mapTypeToLabel(activity.type), [activity.type]);
    const typeVariant = useMemo(() => mapTypeToVariant(activity.type), [activity.type]);
    const formattedAmount = useMemo(() => formatCurrency(activity.amount), [activity.amount]);
    const isRecharge = useMemo(() => activity.type === 'recharge_game', [activity.type]);
    const isRedeem = useMemo(() => activity.type === 'redeem_game', [activity.type]);

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
    const formattedUpdatedAt = useMemo(() => formatDate(activity.updated_at), [activity.updated_at]);
    const showUpdatedAt = useMemo(() => activity.updated_at !== activity.created_at, [activity.updated_at, activity.created_at]);

    const handleViewClick = useCallback(() => {
        onView(activity);
    }, [activity, onView]);

    return (
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm shrink-0">
                            {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {websiteUsername || `User ${activity.user_id}`}
                            </div>
                            {websiteEmail && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {websiteEmail}
                                </div>
                            )}
                            {(() => {
                                const activityCompany = activity.company_username 
                                    ? companyMapByUsername.get(activity.company_username)
                                    : null;
                                
                                if (activityCompany) {
                                    return (
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {activityCompany.project_name}
                                        </div>
                                    );
                                }
                                
                                // Fallback: show company_username if available
                                if (activity.company_username) {
                                    return (
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {activity.company_username}
                                        </div>
                                    );
                                }
                                
                                return null;
                            })()}
                        </div>
                    </div>
                    <Badge variant={statusVariant} className="capitalize shrink-0">
                        {activity.status}
                    </Badge>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Activity:</span>
                        <Badge variant={typeVariant} className="capitalize">
                            {typeLabel}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Game:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{activity.game}</span>
                    </div>
                    {!isAddUserAction && gameUsername && (
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Game Username:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{gameUsername}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                        <span className={`font-bold ${isRedeem ? 'text-red-600 dark:text-red-400' : isRecharge ? 'text-green-600 dark:text-green-400' : ''}`}>
                            {formattedAmount}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Date:</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formattedCreatedAt}
                            {showUpdatedAt && ` (Updated: ${formattedUpdatedAt})`}
                        </span>
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleViewClick}
                        className="w-full flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.activity.id === nextProps.activity.id &&
        prevProps.activity.status === nextProps.activity.status &&
        prevProps.activity.company_username === nextProps.activity.company_username &&
        prevProps.onView === nextProps.onView
    );
});
