'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Skeleton, Pagination, Button } from '@/components/ui';
import { useTransactionsStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { EmptyState, TransactionDetailsModal } from '@/components/features';
import { HistoryTransactionsFilters, HistoryTransactionsFiltersState } from '@/components/dashboard/history/history-transactions-filters';
import { agentsApi, paymentMethodsApi } from '@/lib/api';
import type { Agent, PaymentMethod, Company, Transaction } from '@/types';

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
        operator: '', // Operator filter removed for superadmin
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
    const searchParams = useSearchParams();
    const pathname = usePathname();
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

    // Company filter state
    const [companySearchTerm, setCompanySearchTerm] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Initialize filter once and clear any previous filters (unless preserveFilters is set)
    useEffect(() => {
        const preserveFilters = searchParams.get('preserveFilters');
        const shouldPreserveFilters = preserveFilters === 'true';

        // Remove preserveFilters query parameter after reading it
        if (shouldPreserveFilters) {
            const params = new URLSearchParams(window.location.search);
            params.delete('preserveFilters');
            const newSearch = params.toString();
            const newUrl = newSearch
                ? `${pathname}?${newSearch}`
                : pathname;
            window.history.replaceState({}, '', newUrl);
        }

        // Only clear filters if preserveFilters is not set
        if (!shouldPreserveFilters) {
            setAdvancedFiltersWithoutFetch({});
        }
        setFilter('history');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch companies
    useEffect(() => {
        fetchCompanies();
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

                console.log('Loaded agents:', mappedOptions.length, mappedOptions);
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

                console.log('Loaded payment methods:', mappedOptions.length, mappedOptions);
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


    const fetchCompanies = async () => {
        setIsLoadingCompanies(true);
        try {
            const response = await paymentMethodsApi.getManagementCompanies();
            if (response.companies) {
                setCompanies(response.companies);
            } else {
                setCompanies([]);
            }
        } catch (err: unknown) {
            console.error('Failed to load companies:', err);
            setCompanies([]);
        } finally {
            setIsLoadingCompanies(false);
        }
    };

    const handleFilterChange = useCallback((key: keyof HistoryTransactionsFiltersState, value: string) => {
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
            Object.entries(filters).filter(([key, value]) => {
                if (key === 'game') return false; // Remove game filter as it's not used for transactions
                if (key === 'operator') return false; // Remove operator filter for superadmin
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
    }, [filters, selectedCompanyId, setAdvancedFiltersWithoutFetch, agentIdMap]);

    const handleClearFilters = useCallback(() => {
        setFilters({ ...DEFAULT_HISTORY_FILTERS });
        setSelectedCompanyId(null);
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

    const handleViewTransaction = useCallback((transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsViewModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsViewModalOpen(false);
        setSelectedTransaction(null);
    }, []);

    const transactionList = transactions?.results || [];

    // Filter companies based on search term
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

            {/* Company Filter */}
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
                                                    {selectedCompany.project_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    @{selectedCompany.username}
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
                                    {isLoadingCompanies ? (
                                        <div className="p-6 text-center text-muted-foreground">
                                            <p className="text-sm">Loading companies...</p>
                                        </div>
                                    ) : filteredCompanies.length === 0 ? (
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
                                                        <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
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
                isLoading={isLoading}
            />

            {/* Transactions Table */}
            <Card className="mt-4 md:mt-6 shadow-sm md:shadow-md border md:border-2 rounded-xl md:rounded-lg overflow-hidden">
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
                            <div className="hidden lg:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Transaction</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Previous Balance</TableHead>
                                            <TableHead>New Balance</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Payment</TableHead>
                                            <TableHead>Dates</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactionList.map((transaction) => {
                                            const username = transaction.user_username || `User ${transaction.id}`;
                                            const transactionType = transaction.type || '—';
                                            const isPurchase = transactionType === 'purchase';
                                            const typeVariant = isPurchase ? 'success' : 'danger';
                                            const amountColorClass = isPurchase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                            
                                            const bonusAmount = parseFloat(transaction.bonus_amount || '0');
                                            const formattedBonus = bonusAmount > 0 ? formatCurrency(String(bonusAmount)) : null;
                                            
                                            const userInitial = username.charAt(0).toUpperCase();
                                            const formattedCreatedAt = formatDate(transaction.created_at || transaction.created);
                                            const formattedUpdatedAt = formatDate(transaction.updated_at || transaction.updated);

                                            return (
                                                <TableRow key={transaction.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
                                                                {userInitial}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                                    {username}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {transaction.user_email || '—'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {selectedCompany ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center font-bold text-xs text-primary">
                                                                    {selectedCompany.project_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-sm truncate">
                                                                        {selectedCompany.project_name}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground truncate">
                                                                        @{selectedCompany.username}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">All Companies</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={typeVariant} className="text-xs uppercase">
                                                            {transactionType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={`text-sm font-bold ${amountColorClass}`}>
                                                            {formatCurrency(transaction.amount || '0')}
                                                        </div>
                                                        {formattedBonus && (
                                                            <div className={`text-xs font-semibold mt-0.5 ${amountColorClass}`}>
                                                                +{formattedBonus} bonus
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                C: {formatCurrency(transaction.previous_balance || '0')}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                W: {transaction.previous_winning_balance && !isNaN(parseFloat(transaction.previous_winning_balance))
                                                                    ? formatCurrency(transaction.previous_winning_balance)
                                                                    : formatCurrency('0')}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                C: {formatCurrency(transaction.new_balance || '0')}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                W: {transaction.new_winning_balance && !isNaN(parseFloat(transaction.new_winning_balance))
                                                                    ? formatCurrency(transaction.new_winning_balance)
                                                                    : formatCurrency('0')}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                transaction.status === 'completed' ? 'success' :
                                                                    transaction.status === 'pending' ? 'warning' :
                                                                        transaction.status === 'failed' || transaction.status === 'cancelled' ? 'danger' : 'default'
                                                            }
                                                            className="capitalize"
                                                        >
                                                            {transaction.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="info" className="text-xs">
                                                            {transaction.payment_method || '—'}
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
                                                                onClick={() => handleViewTransaction(transaction)}
                                                                title="View transaction"
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
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
                                {transactionList.map((transaction) => {
                                    const username = transaction.user_username || `User ${transaction.id}`;
                                    const transactionType = transaction.type || '—';
                                    const isPurchase = transactionType === 'purchase';
                                    const typeVariant = isPurchase ? 'success' : 'danger';
                                    const amountColorClass = isPurchase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                    
                                    const bonusAmount = parseFloat(transaction.bonus_amount || '0');
                                    const formattedBonus = bonusAmount > 0 ? formatCurrency(String(bonusAmount)) : null;
                                    
                                    const userInitial = username.charAt(0).toUpperCase();
                                    const formattedCreatedAt = formatDate(transaction.created_at || transaction.created);

                                    return (
                                        <div
                                            key={transaction.id}
                                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden"
                                        >
                                            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
                                                        {userInitial}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                                    {username}
                                                                </h3>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                                    {transaction.user_email || '—'}
                                                                </p>
                                                            </div>
                                                            <Badge variant={typeVariant} className="text-[10px] px-2 py-0.5 uppercase shrink-0">
                                                                {transactionType}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant={
                                                                    transaction.status === 'completed' ? 'success' :
                                                                        transaction.status === 'pending' ? 'warning' :
                                                                            transaction.status === 'failed' || transaction.status === 'cancelled' ? 'danger' : 'default'
                                                                }
                                                                className="text-[10px] px-2 py-0.5 capitalize"
                                                            >
                                                                {transaction.status}
                                                            </Badge>
                                                            <Badge variant="info" className="text-[10px] px-2 py-0.5 truncate flex-1 min-w-0">
                                                                {transaction.payment_method || '—'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedCompany && (
                                                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center font-bold text-xs text-primary">
                                                            {selectedCompany.project_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-medium text-sm truncate">
                                                                {selectedCompany.project_name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                @{selectedCompany.username}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Amount</span>
                                                    <div className="text-right">
                                                        <div className={`text-base font-bold ${amountColorClass}`}>
                                                            {formatCurrency(transaction.amount || '0')}
                                                        </div>
                                                        {formattedBonus && (
                                                            <div className={`text-xs font-semibold mt-0.5 ${amountColorClass}`}>
                                                                +{formattedBonus} bonus
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
                                                        <div className="text-[10px] text-blue-700 dark:text-blue-300 uppercase mb-0.5 font-medium">Previous Credit</div>
                                                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                            {formatCurrency(transaction.previous_balance || '0')}
                                                        </div>
                                                    </div>
                                                    <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-2">
                                                        <div className="text-[10px] text-green-700 dark:text-green-300 uppercase mb-0.5 font-medium">Previous Winning</div>
                                                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                                            {transaction.previous_winning_balance && !isNaN(parseFloat(transaction.previous_winning_balance))
                                                                ? formatCurrency(transaction.previous_winning_balance)
                                                                : formatCurrency('0')}
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
                                                        <div className="text-[10px] text-blue-700 dark:text-blue-300 uppercase mb-0.5 font-medium">New Credit</div>
                                                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                            {formatCurrency(transaction.new_balance || '0')}
                                                        </div>
                                                    </div>
                                                    <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-2">
                                                        <div className="text-[10px] text-green-700 dark:text-green-300 uppercase mb-0.5 font-medium">New Winning</div>
                                                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                                            {transaction.new_winning_balance && !isNaN(parseFloat(transaction.new_winning_balance))
                                                                ? formatCurrency(transaction.new_winning_balance)
                                                                : formatCurrency('0')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{formattedCreatedAt}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleViewTransaction(transaction)}
                                                    className="px-3 py-1.5 text-xs touch-manipulation shrink-0"
                                                >
                                                    View
                                                </Button>
                                            </div>
                                        </div>
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

            {/* Transaction Details Modal */}
            {selectedTransaction && (
                <TransactionDetailsModal
                    transaction={selectedTransaction}
                    isOpen={isViewModalOpen}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}
