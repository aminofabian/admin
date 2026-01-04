'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import {
  DashboardSectionContainer,
} from '@/components/dashboard/layout';
import { Badge, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast, Skeleton } from '@/components/ui';
import { EmptyState, TransactionDetailsModal } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionsStore } from '@/stores';
import { agentsApi, paymentMethodsApi, staffsApi, managersApi } from '@/lib/api';
import { storage } from '@/lib/utils/storage';
import type { Agent, PaymentMethod, Transaction, Staff, Manager, PaginatedResponse } from '@/types';
import { HistoryTransactionsFilters, HistoryTransactionsFiltersState } from '@/components/dashboard/history/history-transactions-filters';

const TRANSACTIONS_SKELETON = (
  <div className="space-y-6">
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
        <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
        <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-48 shrink-0" />
        <div className="flex-1 min-w-0" />
      </div>
    </div>

    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-9 gap-4 px-4 py-3">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-9 gap-4 px-4 py-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-5 w-20" />
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
  game: '', // Keep in state for compatibility but will be removed when applying
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

export function TransactionsSection() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const transactions = useTransactionsStore((state) => state.transactions);
  const isLoading = useTransactionsStore((state) => state.isLoading);
  const error = useTransactionsStore((state) => state.error);
  const currentPage = useTransactionsStore((state) => state.currentPage);
  const pageSize = useTransactionsStore((state) => state.pageSize);
  const filter = useTransactionsStore((state) => state.filter);
  const advancedFilters = useTransactionsStore((state) => state.advancedFilters);
  const setPage = useTransactionsStore((state) => state.setPage);
  const fetchTransactionsStore = useTransactionsStore((state) => state.fetchTransactions);
  const setAdvancedFiltersWithoutFetch = useTransactionsStore((state) => state.setAdvancedFiltersWithoutFetch);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearAdvancedFilters = useTransactionsStore((state) => state.clearAdvancedFilters);
  const clearAdvancedFiltersWithoutFetch = useTransactionsStore((state) => state.clearAdvancedFiltersWithoutFetch);
  const setFilterWithoutFetch = useTransactionsStore((state) => state.setFilterWithoutFetch);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateTransaction = useTransactionsStore((state) => state.updateTransaction);
  const getStoreState = useTransactionsStore.getState;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { addToast } = useToast();
  const fetchTransactionsRef = useRef(fetchTransactionsStore);
  fetchTransactionsRef.current = fetchTransactionsStore;

  const handleFetchTransactions = useCallback(() => {
    fetchTransactionsRef.current();
  }, []);

  // Track component mount and previous values to prevent duplicate calls during React's strict mode
  const isFirstMountRef = useRef(true);
  const previousDepsRef = useRef<{ page: number; filter: string; filters: string } | null>(null);
  const hasInitializedRef = useRef(false);

  const [filters, setFilters] = useState<HistoryTransactionsFiltersState>(DEFAULT_HISTORY_FILTERS);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [agentIdMap, setAgentIdMap] = useState<Map<string, number>>(new Map());
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isPaymentMethodLoading, setIsPaymentMethodLoading] = useState(false);
  const [operatorOptions, setOperatorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isOperatorLoading, setIsOperatorLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lastNotificationKeyRef = useRef<string>('');

  const advancedFiltersString = useMemo(() => JSON.stringify(advancedFilters), [advancedFilters]);

  useEffect(() => {
    console.log('🏗️ TransactionsSection component MOUNTED at:', new Date().toISOString());
    return () => {
      console.log('🏗️ TransactionsSection component UNMOUNTED at:', new Date().toISOString());
      // Reset on unmount so next mount is treated as first
      isFirstMountRef.current = true;
      previousDepsRef.current = null;
      hasInitializedRef.current = false;
    };
  }, []);

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const currentAdvancedFilters = storeState.advancedFilters;
    const currentFilter = storeState.filter;
    
    // Clear filters unless they should be preserved (from player details navigation)
    if (!shouldPreserveFilters) {
      clearAdvancedFiltersWithoutFetch();
      setFilters(DEFAULT_HISTORY_FILTERS);
      setAreFiltersOpen(false);
    }
    
    // Always ensure filter is set to history
    if (currentFilter !== 'history') {
      setFilterWithoutFetch('history');
    }
  }, [clearAdvancedFiltersWithoutFetch, setFilterWithoutFetch, getStoreState, searchParams]);

  // Fetch on mount and when filter/advancedFilters change
  useEffect(() => {
    if (filter === 'history') {
      fetchTransactionsRef.current();
    }
  }, [currentPage, filter, advancedFiltersString]);



  // Sync filters from store
  useEffect(() => {
    const filterState = buildHistoryFilterState(advancedFilters);

    // Sync agent name and ID
    if (agentIdMap.size > 0) {
      if (filterState.agent_id && !filterState.agent) {
        const agentUsername = Array.from(agentIdMap.entries()).find(
          ([, id]) => String(id) === filterState.agent_id
        )?.[0];
        if (agentUsername) {
          filterState.agent = agentUsername;
        }
      }

      if (filterState.agent && !filterState.agent_id) {
        const agentId = agentIdMap.get(filterState.agent);
        if (agentId) {
          filterState.agent_id = String(agentId);
        }
      }
    }

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
  }, [advancedFilters, agentIdMap]);

  // Lazy load agents when filters are opened
  useEffect(() => {
    if (!areFiltersOpen || agentOptions.length > 0) {
      return;
    }

    let isMounted = true;
    let isCancelled = false;

    const loadAgents = async () => {
      if (isCancelled || !isMounted) {
        return;
      }

      setIsAgentLoading(true);

      try {
        const aggregated: Agent[] = [];
        const pageSize = 100;
        let page = 1;
        let hasNext = true;

        while (hasNext && isMounted && !isCancelled) {
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

          if (!hasNext) {
            break;
          }
        }

        if (!isMounted || isCancelled) {
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

        if (isMounted && !isCancelled && idMap.size > 0) {
          const currentFilters = getStoreState().advancedFilters;
          if (currentFilters.agent && !currentFilters.agent_id) {
            let agentId = idMap.get(currentFilters.agent);

            if (!agentId) {
              const agentKey = Array.from(idMap.keys()).find(
                (key) => key.toLowerCase() === currentFilters.agent.toLowerCase()
              );
              if (agentKey) {
                agentId = idMap.get(agentKey);
                console.log('🔍 Found agent with case-insensitive match:', currentFilters.agent, '→', agentKey);
              }
            }

            if (agentId) {
              console.log('🔍 Resolved agent_id for agent:', currentFilters.agent, '→', agentId);
              const updatedFilters: Record<string, string> = {
                ...currentFilters,
                agent_id: String(agentId),
              };
              const agentKey = Array.from(idMap.keys()).find(
                (key) => idMap.get(key) === agentId
              );
              if (agentKey && agentKey !== currentFilters.agent) {
                updatedFilters.agent = agentKey;
                console.log('🔍 Updated agent name to match case:', agentKey);
              }
              setAdvancedFiltersWithoutFetch(updatedFilters);
            } else {
              console.warn('⚠️ Agent not found in loaded agents:', currentFilters.agent);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load agents for transaction filters:', error);
      } finally {
        if (isMounted && !isCancelled) {
          setIsAgentLoading(false);
        }
      }
    };

    loadAgents();

    return () => {
      isCancelled = true;
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areFiltersOpen, agentOptions.length, setAdvancedFiltersWithoutFetch]);


  // Lazy load payment methods when filters are opened
  useEffect(() => {
    if (!areFiltersOpen || paymentMethodOptions.length > 0) {
      return;
    }

    let isMounted = true;
    let isCancelled = false;

    const loadPaymentMethods = async () => {
      if (isCancelled || !isMounted) {
        return;
      }

      setIsPaymentMethodLoading(true);

      try {
        const response = await paymentMethodsApi.list();

        if (!isMounted || isCancelled) {
          return;
        }

        const collection = [
          ...(response?.cashout ?? []),
          ...(response?.purchase ?? []),
        ];

        const uniqueMethods = new Map<string, string>();

        collection.forEach((method: PaymentMethod) => {
          if (!method) {
            return;
          }

          const value = method.payment_method?.trim();
          if (!value) {
            return;
          }

          const label = method.payment_method_display?.trim() || value;
          uniqueMethods.set(value, label);
        });

        const mapped = Array.from(uniqueMethods.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

        setPaymentMethodOptions(mapped);
      } catch (error) {
        console.error('Failed to load payment methods for transaction filters:', error);
      } finally {
        if (isMounted && !isCancelled) {
          setIsPaymentMethodLoading(false);
        }
      }
    };

    loadPaymentMethods();

    return () => {
      isCancelled = true;
      isMounted = false;
    };
  }, [areFiltersOpen, paymentMethodOptions.length]);

  // Load operators on mount (always load for staff portal)
  useEffect(() => {
    if (operatorOptions.length > 0) {
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
        // Get company name from URL hostname
        // e.g., bitslot.bruii.com -> bitslot, spincash.bruii.com -> spincash
        // For localhost, default to bitslot
        let companyName = 'bitslot';
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            companyName = 'bitslot';
          } else if (hostname.includes('.bruii.com')) {
            // Extract subdomain (company name) from hostname
            companyName = hostname.split('.bruii.com')[0];
          } else {
            // Fallback: try to extract subdomain if it exists
            const parts = hostname.split('.');
            if (parts.length > 1) {
              companyName = parts[0];
            }
          }
        }

        // Get user role and username from localStorage
        let userRole: string | undefined;
        let username: string | undefined;
        const userData = storage.get('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user?.role) {
              userRole = user.role;
            }
            if (user?.username) {
              username = user.username;
            }
          } catch (error) {
            console.warn('Failed to parse user data from localStorage:', error);
          }
        }

        const operatorMap = new Map<string, { value: string; label: string }>();

        // Add "Bot" operator - use 'bot' as value, 'Bot' as label
        operatorMap.set('bot', { value: 'bot', label: 'Bot' });

        // Add "Company" - use company name from URL
        operatorMap.set(companyName, { value: companyName, label: companyName });

        // Add user's username for managers and staff
        if ((userRole === 'manager' || userRole === 'staff') && username) {
          operatorMap.set(username, { value: username, label: username });
        }

        // Try to fetch active staff (may fail for staff users due to permissions)
        // Skip if current user is staff
        if (userRole !== 'staff') {
          try {
            const staffResponse = await staffsApi.list({ page_size: 100 });
            const activeStaff = (staffResponse?.results || []).filter((staff: Staff) => staff.is_active);
            activeStaff.forEach((staff: Staff) => {
              if (staff?.username) {
                operatorMap.set(staff.username, { value: staff.username, label: staff.username });
              }
            });
          } catch (error) {
            // Permission denied is expected for staff users - silently skip
            console.debug('Cannot load staff list (permission denied - expected for staff users)');
          }
        }

        // Try to fetch active managers (skip if current user is manager)
        if (userRole !== 'manager') {
          try {
            const managersResponse = await managersApi.list({ page_size: 100 });
            const activeManagers = (managersResponse?.results || []).filter((manager: Manager) => manager.is_active);
            activeManagers.forEach((manager: Manager) => {
              if (manager?.username) {
                operatorMap.set(manager.username, { value: manager.username, label: manager.username });
              }
            });
          } catch (error) {
            // Permission denied is expected for staff users - silently skip
            console.debug('Cannot load managers list (permission denied - expected for staff users)');
          }
        }

        if (!isMounted || isCancelled) {
          return;
        }

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
        console.error('Failed to load operators for transaction filters:', error);
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
  }, [operatorOptions.length]);

  const handleAdvancedFilterChange = useCallback((key: keyof HistoryTransactionsFiltersState, value: string) => {
    setFilters((previous) => {
      const updated = { ...previous, [key]: value };

      if (key === 'agent') {
        const agentId = agentIdMap.get(value);
        if (agentId) {
          updated.agent_id = String(agentId);
        } else {
          updated.agent_id = '';
        }
      }

      if (key === 'agent_id') {
        if (value) {
          const agentUsername = Array.from(agentIdMap.entries()).find(([, id]) => String(id) === value)?.[0];
          if (agentUsername) {
            updated.agent = agentUsername;
          }
        } else {
          updated.agent = '';
        }
      }

      return updated;
    });
  }, [agentIdMap]);

  const handleApplyAdvancedFilters = useCallback(() => {
    const sanitized = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => {
        if (typeof value === 'string') {
          return value.trim() !== '';
        }
        return Boolean(value);
      })
    ) as Record<string, string>;

    // Remove game filter (not needed in history)
    delete sanitized.game;

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

    // For history filter, exclude pending status
    const isHistoryView = filter === 'history';
    if (isHistoryView) {
      // If status is pending, remove it (history shouldn't show pending)
      if (sanitized.status === 'pending') {
        delete sanitized.status;
      }
      // If no status is set, ensure we exclude pending
      // The backend should handle this, but we'll make sure status is not pending
      if (!sanitized.status) {
        // Don't set status, let backend exclude pending for history
        // The store will handle status__ne = 'pending' for history
      }
    }

    // Transaction type filter: keep purchase/cashout as type parameter
    // The store will respect this when filter is 'history' or 'all'
    if (sanitized.type && sanitized.type !== 'purchase' && sanitized.type !== 'cashout') {
      // For other types, remove it (not supported in advanced filters)
      delete sanitized.type;
    }
    // If type is purchase or cashout, keep it as-is - the store will use it

    console.log('🔍 Applying advanced filters - type filter:', {
      originalType: filters.type,
      sanitizedType: sanitized.type,
      mainFilter: filter,
      willPreserveType: sanitized.type === 'purchase' || sanitized.type === 'cashout',
    });

    if (sanitized.agent && !sanitized.agent_id) {
      const agentId = agentIdMap.get(sanitized.agent);
      if (agentId) {
        sanitized.agent_id = String(agentId);
      }
    }

    // Log username/email specifically for debugging partial search
    if (sanitized.username || sanitized.email) {
      console.log('🔍 Username/Email in sanitized filters:', {
        username: sanitized.username,
        email: sanitized.email,
        usernameTrimmed: sanitized.username?.trim(),
        emailTrimmed: sanitized.email?.trim(),
      });
    }

    console.log('🔍 Applying filters:', {
      originalFilters: filters,
      sanitizedFilters: sanitized,
      dateFrom: sanitized.date_from,
      dateTo: sanitized.date_to,
      hasDateFrom: Boolean(sanitized.date_from),
      hasDateTo: Boolean(sanitized.date_to),
      isHistoryView,
      username: sanitized.username,
      email: sanitized.email,
    });

    setAdvancedFiltersWithoutFetch(sanitized);
  }, [filters, setAdvancedFiltersWithoutFetch, agentIdMap, filter]);

  const handleClearAdvancedFilters = useCallback(() => {
    setFilters({ ...DEFAULT_HISTORY_FILTERS });
    setAdvancedFiltersWithoutFetch({});
  }, [setAdvancedFiltersWithoutFetch]);

  const handleToggleAdvancedFilters = useCallback(() => {
    setAreFiltersOpen((previous) => !previous);
  }, []);


  const results = useMemo(() => {
    if (isLoading) {
      return [];
    }
    return transactions?.results ?? [];
  }, [transactions?.results, isLoading]);

  const totalCount = useMemo(() => {
    if (isLoading) {
      return 0;
    }
    return transactions?.count ?? 0;
  }, [transactions?.count, isLoading]);

  const isInitialLoading = useMemo(() => isLoading, [isLoading]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isEmpty = useMemo(() => !results.length && !isLoading, [results.length, isLoading]);

  return (
    <DashboardSectionContainer
      isLoading={isInitialLoading}
      error={error ?? ''}
      onRetry={handleFetchTransactions}
      isEmpty={false}
      emptyState={null}
      loadingState={TRANSACTIONS_SKELETON}
    >
      <TransactionsLayout
        filter={filter}
        advancedFilters={filters}
        onAdvancedFilterChange={handleAdvancedFilterChange}
        onApplyAdvancedFilters={handleApplyAdvancedFilters}
        onClearAdvancedFilters={handleClearAdvancedFilters}
        areAdvancedFiltersOpen={areFiltersOpen}
        onToggleAdvancedFilters={handleToggleAdvancedFilters}
        transactions={transactions}
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        agentOptions={agentOptions}
        isAgentLoadingAgents={isAgentLoading}
        paymentMethodOptions={paymentMethodOptions}
        isPaymentMethodLoading={isPaymentMethodLoading}
        operatorOptions={operatorOptions}
        isOperatorLoading={isOperatorLoading}
        isLoading={isLoading}
      />
    </DashboardSectionContainer>
  );
}

interface TransactionsLayoutProps {
  filter: string;
  advancedFilters: HistoryTransactionsFiltersState;
  onAdvancedFilterChange: (key: keyof HistoryTransactionsFiltersState, value: string) => void;
  onApplyAdvancedFilters: () => void;
  onClearAdvancedFilters: () => void;
  areAdvancedFiltersOpen: boolean;
  onToggleAdvancedFilters: () => void;
  transactions: PaginatedResponse<Transaction> | null;
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  agentOptions: Array<{ value: string; label: string }>;
  isAgentLoadingAgents: boolean;
  paymentMethodOptions: Array<{ value: string; label: string }>;
  isPaymentMethodLoading: boolean;
  operatorOptions: Array<{ value: string; label: string }>;
  isOperatorLoading: boolean;
  isLoading: boolean;
}

function TransactionsLayout({
  filter,
  advancedFilters,
  onAdvancedFilterChange,
  onApplyAdvancedFilters,
  onClearAdvancedFilters,
  areAdvancedFiltersOpen,
  onToggleAdvancedFilters,
  transactions,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  agentOptions,
  isAgentLoadingAgents,
  paymentMethodOptions,
  isPaymentMethodLoading,
  operatorOptions,
  isOperatorLoading,
  isLoading,
}: TransactionsLayoutProps) {
  const headingTitle = filter === 'history' ? 'Transactions History' : 'Transactions';
  const shouldShowFilterBadge = filter !== 'all' && filter !== 'history';

  return (
    <>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-6 4h6m-6 4h6m-9 4h12" />
            </svg>
          </div>

          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            {headingTitle}
          </h2>

          {shouldShowFilterBadge && (
            <Badge variant="info" className="uppercase tracking-wide text-[10px] sm:text-xs shrink-0">
              {formatFilterLabel(filter)}
            </Badge>
          )}

          <div className="flex-1 min-w-0" />
        </div>
      </div>
      <HistoryTransactionsFilters
        filters={advancedFilters}
        onFilterChange={onAdvancedFilterChange}
        onApply={onApplyAdvancedFilters}
        onClear={onClearAdvancedFilters}
        isOpen={areAdvancedFiltersOpen}
        onToggle={onToggleAdvancedFilters}
        statusOptions={[
          { value: '', label: 'All Statuses' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'failed', label: 'Failed' },
        ]}
        agentOptions={agentOptions}
        isAgentLoading={isAgentLoadingAgents}
        paymentMethodOptions={paymentMethodOptions}
        isPaymentMethodLoading={isPaymentMethodLoading}
        operatorOptions={operatorOptions}
        isOperatorLoading={isOperatorLoading}
        isLoading={isLoading}
      />

      <TransactionsTable
        transactions={transactions}
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </>
  );
}

interface TransactionsTableProps {
  transactions: PaginatedResponse<Transaction> | null;
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function TransactionsTable({
  transactions,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: TransactionsTableProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleViewTransaction = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsViewModalOpen(false);
    setSelectedTransaction(null);
  }, []);

  const transactionResults = useMemo(() => transactions?.results ?? [], [transactions?.results]);
  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);
  const hasNext = useMemo(() => !!transactions?.next, [transactions?.next]);
  const hasPrevious = useMemo(() => !!transactions?.previous, [transactions?.previous]);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!transactionResults.length ? (
          <div className="py-12">
            <EmptyState
              title="No Transactions found"
              description="Try adjusting your filters or search criteria"
            />
          </div>
        ) : (
          <>
            <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
              {transactionResults.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onView={handleViewTransaction}
                />
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Winning</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionResults.map((transaction) => (
                    <TransactionsRow
                      key={transaction.id}
                      transaction={transaction}
                      onView={handleViewTransaction}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalCount > pageSize && (
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                />
              </div>
            )}
          </>
        )}
      </div>

      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          isOpen={isViewModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

interface TransactionsRowProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
}

const TransactionsRow = memo(function TransactionsRow({ transaction, onView }: TransactionsRowProps) {
  const router = useRouter();
  const statusVariant = useMemo(() => mapStatusToVariant(transaction.status), [transaction.status]);
  const isPurchase = useMemo(() => transaction.type === 'purchase', [transaction.type]);
  const typeVariant = useMemo(() => isPurchase ? 'success' : 'danger', [isPurchase]);
  const formattedAmount = useMemo(() => formatCurrency(transaction.amount), [transaction.amount]);
  const amountColorClass = useMemo(() => (isPurchase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'), [isPurchase]);
  const bonusColorClass = useMemo(() => (isPurchase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'), [isPurchase]);

  const bonusAmount = useMemo(() => {
    const bonus = parseFloat(transaction.bonus_amount || '0');
    return bonus > 0 ? bonus : null;
  }, [transaction.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

  const userInitial = useMemo(() => {
    return transaction.user_username.charAt(0).toUpperCase();
  }, [transaction.user_username]);

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created_at), [transaction.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(transaction.updated_at), [transaction.updated_at]);

  const previousCreditBalance = useMemo(() => {
    const value = transaction.previous_balance && !isNaN(parseFloat(transaction.previous_balance))
      ? parseFloat(transaction.previous_balance)
      : 0;
    return { value, formatted: formatCurrency(String(value)) };
  }, [transaction.previous_balance]);

  const newCreditBalance = useMemo(() => {
    const value = transaction.new_balance && !isNaN(parseFloat(transaction.new_balance))
      ? parseFloat(transaction.new_balance)
      : 0;
    return { value, formatted: formatCurrency(String(value)) };
  }, [transaction.new_balance]);

  const previousWinningBalance = useMemo(() => {
    const value = transaction.previous_winning_balance && !isNaN(parseFloat(transaction.previous_winning_balance))
      ? parseFloat(transaction.previous_winning_balance)
      : 0;
    return { value, formatted: formatCurrency(String(value)) };
  }, [transaction.previous_winning_balance]);

  const newWinningBalance = useMemo(() => {
    const value = transaction.new_winning_balance && !isNaN(parseFloat(transaction.new_winning_balance))
      ? parseFloat(transaction.new_winning_balance)
      : 0;
    return { value, formatted: formatCurrency(String(value)) };
  }, [transaction.new_winning_balance]);

  const creditChanged = useMemo(() => {
    return previousCreditBalance.value !== newCreditBalance.value;
  }, [previousCreditBalance.value, newCreditBalance.value]);

  const winningChanged = useMemo(() => {
    return previousWinningBalance.value !== newWinningBalance.value;
  }, [previousWinningBalance.value, newWinningBalance.value]);

  const creditDisplayText = useMemo(() => {
    return `${previousCreditBalance.formatted} → ${newCreditBalance.formatted}`;
  }, [previousCreditBalance.formatted, newCreditBalance.formatted]);

  const winningDisplayText = useMemo(() => {
    return `${previousWinningBalance.formatted} → ${newWinningBalance.formatted}`;
  }, [previousWinningBalance.formatted, newWinningBalance.formatted]);

  const creditColorClass = useMemo(() => {
    return creditChanged ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-gray-400';
  }, [creditChanged]);

  const winningColorClass = useMemo(() => {
    return winningChanged ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-gray-400';
  }, [winningChanged]);

  const handleOpenTransactionDetails = useCallback(() => {
    onView(transaction);
  }, [transaction, onView]);

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenTransactionDetails}
            className="flex-shrink-0 touch-manipulation"
            title="View transaction details"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
              {userInitial}
            </div>
          </button>
          <div>
            <button
              type="button"
              onClick={handleOpenTransactionDetails}
              className="text-left touch-manipulation"
              title="View transaction details"
            >
              <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {transaction.user_username}
              </div>
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {transaction.user_email}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={typeVariant} className="text-xs uppercase">
          {transaction.type}
        </Badge>
      </TableCell>
      <TableCell>
        <div className={`text-sm font-bold ${amountColorClass}`}>
          {formattedAmount}
        </div>
        {formattedBonus && (
          <div className={`text-xs font-semibold mt-0.5 ${bonusColorClass}`}>
            +{formattedBonus} bonus
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className={`text-xs ${creditColorClass}`}>
          {creditDisplayText}
        </div>
      </TableCell>
      <TableCell>
        <div className={`text-xs ${winningColorClass}`}>
          {winningDisplayText}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {transaction.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="info" className="text-xs">
          {transaction.payment_method}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>{formattedCreatedAt}</div>
          <div>{formattedUpdatedAt}</div>
        </div>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.transaction.status === nextProps.transaction.status &&
    prevProps.transaction.amount === nextProps.transaction.amount &&
    prevProps.transaction.updated_at === nextProps.transaction.updated_at &&
    prevProps.transaction.updated === nextProps.transaction.updated &&
    prevProps.onView === nextProps.onView &&
    prevProps.transaction.user_username === nextProps.transaction.user_username &&
    prevProps.transaction.previous_balance === nextProps.transaction.previous_balance &&
    prevProps.transaction.new_balance === nextProps.transaction.new_balance &&
    prevProps.transaction.previous_winning_balance === nextProps.transaction.previous_winning_balance &&
    prevProps.transaction.new_winning_balance === nextProps.transaction.new_winning_balance
  );
});

interface TransactionCardProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
}

const TransactionCard = memo(function TransactionCard({ transaction, onView }: TransactionCardProps) {
  const router = useRouter();
  const statusVariant = useMemo(() => mapStatusToVariant(transaction.status), [transaction.status]);
  const isPurchase = useMemo(() => transaction.type === 'purchase', [transaction.type]);
  const typeVariant = useMemo(() => isPurchase ? 'success' : 'danger', [isPurchase]);
  const formattedAmount = useMemo(() => formatCurrency(transaction.amount), [transaction.amount]);
  const amountColorClass = useMemo(() => (isPurchase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'), [isPurchase]);

  const bonusAmount = useMemo(() => {
    const bonus = parseFloat(transaction.bonus_amount || '0');
    return bonus > 0 ? bonus : null;
  }, [transaction.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

  const userInitial = useMemo(() => {
    return transaction.user_username.charAt(0).toUpperCase();
  }, [transaction.user_username]);

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created_at), [transaction.created_at]);

  const handleOpenTransactionDetails = useCallback(() => {
    onView(transaction);
  }, [transaction, onView]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleOpenTransactionDetails}
            className="flex-shrink-0 touch-manipulation"
            title="View transaction details"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md cursor-pointer hover:opacity-80 transition-opacity">
              {userInitial}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={handleOpenTransactionDetails}
                  className="text-left w-full touch-manipulation"
                  title="View transaction details"
                >
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {transaction.user_username}
                  </h3>
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {transaction.user_email}
                </p>
              </div>
              <Badge variant={typeVariant} className="text-[10px] px-2 py-0.5 uppercase shrink-0">
                {transaction.type}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 capitalize">
                {transaction.status}
              </Badge>
              <Badge variant="info" className="text-[10px] px-2 py-0.5 truncate flex-1 min-w-0">
                {transaction.payment_method}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Amount</span>
          <div className="text-right">
            <div className={`text-base font-bold ${amountColorClass}`}>
              {formattedAmount}
            </div>
            {formattedBonus && (
              <div className={`text-xs font-semibold mt-0.5 ${amountColorClass}`}>
                +{formattedBonus} bonus
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* Credit Balance */}
          {(() => {
            const prevCredit = transaction.previous_balance && !isNaN(parseFloat(transaction.previous_balance))
              ? parseFloat(transaction.previous_balance)
              : 0;
            const newCredit = transaction.new_balance && !isNaN(parseFloat(transaction.new_balance))
              ? parseFloat(transaction.new_balance)
              : 0;
            const creditChanged = prevCredit !== newCredit;
            const creditColorClass = creditChanged
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 dark:text-gray-400';

            return (
              <div className="flex-1 min-w-0">
                <div className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Credit</div>
                <div className={`text-xs ${creditColorClass} flex items-center gap-1`}>
                  <span className="truncate">{formatCurrency(String(prevCredit))}</span>
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="font-semibold truncate">{formatCurrency(String(newCredit))}</span>
                </div>
              </div>
            );
          })()}

          {/* Vertical Divider */}
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 shrink-0" />

          {/* Winning Balance */}
          {(() => {
            const prevWinning = transaction.previous_winning_balance && !isNaN(parseFloat(transaction.previous_winning_balance))
              ? parseFloat(transaction.previous_winning_balance)
              : 0;
            const newWinning = transaction.new_winning_balance && !isNaN(parseFloat(transaction.new_winning_balance))
              ? parseFloat(transaction.new_winning_balance)
              : 0;
            const winningChanged = prevWinning !== newWinning;
            const winningColorClass = winningChanged
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 dark:text-gray-400';

            return (
              <div className="flex-1 min-w-0">
                <div className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Winning</div>
                <div className={`text-xs ${winningColorClass} flex items-center gap-1`}>
                  <span className="truncate">{formatCurrency(String(prevWinning))}</span>
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="font-semibold truncate">{formatCurrency(String(newWinning))}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedCreatedAt}</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.transaction.status === nextProps.transaction.status &&
    prevProps.transaction.amount === nextProps.transaction.amount &&
    prevProps.onView === nextProps.onView &&
    prevProps.transaction.user_username === nextProps.transaction.user_username
  );
});

const mapStatusToVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  return 'default';
};

function formatFilterLabel(filter: string): string {
  return filter
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
