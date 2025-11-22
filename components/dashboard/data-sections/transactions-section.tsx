'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DashboardSectionContainer,
} from '@/components/dashboard/layout';
import { Badge, Button, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast, Skeleton } from '@/components/ui';
import { EmptyState, TransactionDetailsModal } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionsStore } from '@/stores';
import { agentsApi, paymentMethodsApi, gamesApi } from '@/lib/api';
import type { Agent, PaymentMethod, Transaction, Game } from '@/types';
import { HistoryTransactionsFilters, HistoryTransactionsFiltersState } from '@/components/dashboard/history/history-transactions-filters';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';

const HEADER_ICON = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-6 4h6m-6 4h6m-9 4h12" />
  </svg>
);

const EMPTY_STATE = (
  <EmptyState
    title="No transactions found"
    description="Try adjusting your filters or search criteria"
  />
);

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

export function TransactionsSection() {
  const transactions = useTransactionsStore((state) => state.transactions);
  const isLoading = useTransactionsStore((state) => state.isLoading);
  const error = useTransactionsStore((state) => state.error);
  const currentPage = useTransactionsStore((state) => state.currentPage);
  const pageSize = useTransactionsStore((state) => state.pageSize);
  const filter = useTransactionsStore((state) => state.filter);
  const advancedFilters = useTransactionsStore((state) => state.advancedFilters);
  const setPage = useTransactionsStore((state) => state.setPage);
  const fetchTransactions = useTransactionsStore((state) => state.fetchTransactions);
  const setAdvancedFiltersWithoutFetch = useTransactionsStore((state) => state.setAdvancedFiltersWithoutFetch);
  const updateTransaction = useTransactionsStore((state) => state.updateTransaction);
  const getStoreState = useTransactionsStore.getState;
  const { addToast } = useToast();

  const [filters, setFilters] = useState<HistoryTransactionsFiltersState>(() => buildHistoryFilterState(advancedFilters));
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [agentIdMap, setAgentIdMap] = useState<Map<string, number>>(new Map());
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isPaymentMethodLoading, setIsPaymentMethodLoading] = useState(false);
  const [gameOptions, setGameOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const lastNotificationKeyRef = useRef<string>('');

  const advancedFiltersString = useMemo(() => JSON.stringify(advancedFilters), [advancedFilters]);

  useEffect(() => {
    console.log('🏗️ TransactionsSection component MOUNTED at:', new Date().toISOString());
    return () => {
      console.log('🏗️ TransactionsSection component UNMOUNTED at:', new Date().toISOString());
    };
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      return;
    }

    fetchTransactions();
  }, [currentPage, filter, fetchTransactions, advancedFiltersString]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const hasNoResults = transactions !== null && transactions.count === 0;
    
    if (!hasNoResults) {
      lastNotificationKeyRef.current = '';
      return;
    }

    const filterKey = JSON.stringify({
      ...advancedFilters,
      filter,
      currentPage,
    });

    if (lastNotificationKeyRef.current === filterKey) {
      return;
    }

    lastNotificationKeyRef.current = filterKey;

    const activeFilters: string[] = [];
    
    if (advancedFilters.agent || advancedFilters.agent_id) {
      activeFilters.push(`agent: ${advancedFilters.agent || 'selected agent'}`);
    }
    if (advancedFilters.username) {
      activeFilters.push(`username: ${advancedFilters.username}`);
    }
    if (advancedFilters.email) {
      activeFilters.push(`email: ${advancedFilters.email}`);
    }
    if (advancedFilters.status) {
      activeFilters.push(`status: ${advancedFilters.status}`);
    }
    if (advancedFilters.type) {
      activeFilters.push(`type: ${advancedFilters.type}`);
    }
    if (advancedFilters.payment_method) {
      activeFilters.push(`payment method: ${advancedFilters.payment_method}`);
    }
    if (advancedFilters.game) {
      activeFilters.push(`game: ${advancedFilters.game}`);
    }
    
    const hasDateFrom = Boolean(advancedFilters.date_from);
    const hasDateTo = Boolean(advancedFilters.date_to);
    const hasDateFilter = hasDateFrom || hasDateTo;
    
    let description = '';
    if (hasDateFilter) {
      const formatDateForDisplay = (dateString: string | undefined): string => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return dateString;
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
          return dateString;
        }
      };
      
      const dateFromDisplay = formatDateForDisplay(advancedFilters.date_from);
      const dateToDisplay = formatDateForDisplay(advancedFilters.date_to);
      
      let dateRangeText = '';
      if (dateFromDisplay && dateToDisplay) {
        dateRangeText = `from ${dateFromDisplay} to ${dateToDisplay}`;
      } else if (dateFromDisplay) {
        dateRangeText = `from ${dateFromDisplay}`;
      } else if (dateToDisplay) {
        dateRangeText = `until ${dateToDisplay}`;
      }
      
      if (activeFilters.length > 0) {
        description = `No transactions found for the selected date range ${dateRangeText} with filters: ${activeFilters.join(', ')}. Please try adjusting your filters.`;
      } else {
        description = `No transactions found for the selected date range ${dateRangeText}. Please try adjusting your date filters.`;
      }
    } else if (activeFilters.length > 0) {
      description = `No transactions found with filters: ${activeFilters.join(', ')}. Please try adjusting your filters.`;
    } else {
      description = 'No transactions found. Please try adjusting your filters or search criteria.';
    }

    addToast({
      type: 'info',
      title: 'No transactions found',
      description,
    });
  }, [transactions, isLoading, advancedFilters, filter, currentPage, addToast]);

  useEffect(() => {
    if (agentIdMap.size === 0) {
      return;
    }

    const filterState = buildHistoryFilterState(advancedFilters);
    let needsUpdate = false;
    const updatedFilters = { ...advancedFilters };
    
    if (filterState.agent_id && !filterState.agent && agentIdMap.size > 0) {
      const agentUsername = Array.from(agentIdMap.entries()).find(
        ([, id]) => String(id) === filterState.agent_id
      )?.[0];
      
      if (agentUsername && advancedFilters.agent !== agentUsername) {
        filterState.agent = agentUsername;
        updatedFilters.agent = agentUsername;
        needsUpdate = true;
      }
    }
    
    if (filterState.agent && !filterState.agent_id && agentIdMap.size > 0) {
      const agentId = agentIdMap.get(filterState.agent);
      if (agentId && advancedFilters.agent_id !== String(agentId)) {
        filterState.agent_id = String(agentId);
        updatedFilters.agent_id = String(agentId);
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      setAdvancedFiltersWithoutFetch(updatedFilters);
    }
    
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
    
    console.log('🔄 Syncing filters:', {
      advancedFilters,
      filterState,
      dateFrom: filterState.date_from,
      dateTo: filterState.date_to,
    });
    
    setFilters(filterState);

    if (Object.keys(advancedFilters).length > 0) {
      setAreFiltersOpen(true);
    }
  }, [advancedFilters, agentIdMap, setAdvancedFiltersWithoutFetch]);

  useEffect(() => {
    console.log('🚀 Agents useEffect triggered - mount at:', new Date().toISOString());
    let isMounted = true;

    const loadAgents = async () => {
      console.log('📥 Loading agents API at:', new Date().toISOString());
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

          if (!hasNext) {
            break;
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
        
        if (isMounted && idMap.size > 0) {
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
        if (isMounted) {
          setIsAgentLoading(false);
        }
      }
    };

    loadAgents();

    return () => {
      console.log('🧹 Agents useEffect cleanup - unmount');
      isMounted = false;
    };
  }, []);


  useEffect(() => {
    console.log('🚀 Payment Methods useEffect triggered - mount at:', new Date().toISOString());
    let isMounted = true;

    const loadPaymentMethods = async () => {
      console.log('📥 Loading payment-methods API at:', new Date().toISOString());
      setIsPaymentMethodLoading(true);

      try {
        const response = await paymentMethodsApi.list();

        if (!isMounted) {
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
        if (isMounted) {
          setIsPaymentMethodLoading(false);
        }
      }
    };

    loadPaymentMethods();

    return () => {
      console.log('🧹 Payment Methods useEffect cleanup - unmount');
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    console.log('🚀 Games useEffect triggered - mount at:', new Date().toISOString());
    let isMounted = true;

    const loadGames = async () => {
      console.log('📥 Loading games API at:', new Date().toISOString());
      setIsGameLoading(true);

      try {
        const games = await gamesApi.list();

        if (!isMounted) {
          return;
        }

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
        console.error('Failed to load games for transaction filters:', error);
      } finally {
        if (isMounted) {
          setIsGameLoading(false);
        }
      }
    };

    loadGames();

    return () => {
      console.log('🧹 Games useEffect cleanup - unmount');
      isMounted = false;
    };
  }, []);

  const { subscribeToTransactionUpdates } = useProcessingWebSocketContext();

  useEffect(() => {
    const isHistoryView = filter === 'history';

    if (!isHistoryView) {
      return;
    }

    const unsubscribeTransaction = subscribeToTransactionUpdates(
      (updatedTransaction: Transaction, isInitialLoad = false) => {
        if (isInitialLoad) {
          return;
        }

        console.log('📨 Transaction history WebSocket update received:', {
          id: updatedTransaction.id,
          status: updatedTransaction.status,
          type: updatedTransaction.type,
          currentFilter: filter,
          hasAdvancedFilters: Object.keys(advancedFilters).length > 0,
        });

        const transactionMatchesFilters = (transaction: Transaction): boolean => {
          if (advancedFilters.agent && transaction.user_username !== advancedFilters.agent) {
            return false;
          }

          if (advancedFilters.agent_id) {
            const agentIdForTransaction = agentIdMap.get(transaction.user_username);
            if (!agentIdForTransaction || String(agentIdForTransaction) !== advancedFilters.agent_id) {
              return false;
            }
          }

          if (advancedFilters.username &&
              !transaction.user_username.toLowerCase().includes(advancedFilters.username.toLowerCase())) {
            return false;
          }

          if (advancedFilters.email &&
              !transaction.user_email.toLowerCase().includes(advancedFilters.email.toLowerCase())) {
            return false;
          }

          if (advancedFilters.status && transaction.status !== advancedFilters.status) {
            return false;
          }

          if (advancedFilters.type && transaction.type !== advancedFilters.type) {
            return false;
          }

          if (advancedFilters.payment_method && transaction.payment_method !== advancedFilters.payment_method) {
            return false;
          }

          if (advancedFilters.game) {
            const gameLower = advancedFilters.game.toLowerCase();
            if (transaction.description && !transaction.description.toLowerCase().includes(gameLower)) {
              return false;
            }
          }

          const transactionDate = new Date(transaction.created_at || transaction.created);

          if (advancedFilters.date_from) {
            const fromDate = new Date(advancedFilters.date_from);
            if (transactionDate < fromDate) {
              return false;
            }
          }

          if (advancedFilters.date_to) {
            const toDate = new Date(advancedFilters.date_to);
            toDate.setHours(23, 59, 59, 999);
            if (transactionDate > toDate) {
              return false;
            }
          }

          const transactionAmount = parseFloat(transaction.amount) || 0;

          if (advancedFilters.amount_min) {
            const minAmount = parseFloat(advancedFilters.amount_min) || 0;
            if (transactionAmount < minAmount) {
              return false;
            }
          }

          if (advancedFilters.amount_max) {
            const maxAmount = parseFloat(advancedFilters.amount_max) || 0;
            if (transactionAmount > maxAmount) {
              return false;
            }
          }

          if (advancedFilters.transaction_id) {
            const searchId = advancedFilters.transaction_id.toLowerCase();
            if (!transaction.id.toLowerCase().includes(searchId) &&
                !transaction.unique_id.toLowerCase().includes(searchId)) {
              return false;
            }
          }

          return true;
        };

        if (!transactionMatchesFilters(updatedTransaction)) {
          console.log('⏭️ Skipping transaction update - does not match current filters');
          return;
        }

        updateTransaction(updatedTransaction);

        console.log('✅ Transaction history updated via WebSocket:', updatedTransaction.id);
      }
    );

    return unsubscribeTransaction;
  }, [subscribeToTransactionUpdates, updateTransaction, filter, advancedFilters, agentIdMap]);

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
      Object.entries(filters).filter(([key, value]) => {
        if (typeof value === 'string') {
          return value.trim() !== '';
        }
        return Boolean(value);
      })
    ) as Record<string, string>;

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

    if (sanitized.type && (sanitized.type === 'purchase' || sanitized.type === 'cashout')) {
    } else if (sanitized.type) {
      const txnValue = sanitized.type === 'purchase'
        ? 'purchases'
        : sanitized.type === 'cashout'
          ? 'cashouts'
          : '';

      if (txnValue) {
        sanitized.txn = txnValue;
      }

      delete sanitized.type;
    }

    if (sanitized.agent && !sanitized.agent_id) {
      const agentId = agentIdMap.get(sanitized.agent);
      if (agentId) {
        sanitized.agent_id = String(agentId);
      }
    }
    
    console.log('🔍 Applying filters:', {
      originalFilters: filters,
      sanitizedFilters: sanitized,
      dateFrom: sanitized.date_from,
      dateTo: sanitized.date_to,
      hasDateFrom: Boolean(sanitized.date_from),
      hasDateTo: Boolean(sanitized.date_to),
    });

    setAdvancedFiltersWithoutFetch(sanitized);
  }, [filters, setAdvancedFiltersWithoutFetch, agentIdMap]);

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
  const isEmpty = useMemo(() => !results.length && !isLoading, [results.length, isLoading]);

  return (
    <DashboardSectionContainer
      isLoading={isInitialLoading}
      error={error ?? ''}
      onRetry={fetchTransactions}
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
        transactions={results}
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        agentOptions={agentOptions}
        isAgentLoadingAgents={isAgentLoading}
        paymentMethodOptions={paymentMethodOptions}
        isPaymentMethodLoading={isPaymentMethodLoading}
        gameOptions={gameOptions}
        isGameLoading={isGameLoading}
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
  transactions: Transaction[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  agentOptions: Array<{ value: string; label: string }>;
  isAgentLoadingAgents: boolean;
  paymentMethodOptions: Array<{ value: string; label: string }>;
  isPaymentMethodLoading: boolean;
  gameOptions: Array<{ value: string; label: string }>;
  isGameLoading: boolean;
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
  gameOptions,
  isGameLoading,
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
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
        agentOptions={agentOptions}
        isAgentLoading={isAgentLoadingAgents}
        paymentMethodOptions={paymentMethodOptions}
        isPaymentMethodLoading={isPaymentMethodLoading}
        gameOptions={gameOptions}
        isGameLoading={isGameLoading}
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
  transactions: Transaction[];
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

  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);
  const hasNext = useMemo(() => currentPage * pageSize < totalCount, [currentPage, pageSize, totalCount]);
  const hasPrevious = useMemo(() => currentPage > 1, [currentPage]);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!transactions.length ? (
          <div className="py-12">
            <EmptyState 
              title="No Transactions found" 
              description="Try adjusting your filters or search criteria"
            />
          </div>
        ) : (
          <>
        <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
          {transactions.map((transaction) => (
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
                <TableHead>Previous Balance</TableHead>
                <TableHead>New Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
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

  const handleViewClick = useCallback(() => {
    onView(transaction);
  }, [transaction, onView]);

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
            {userInitial}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {transaction.user_username}
            </div>
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
        <div className="space-y-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            C: {formatCurrency(transaction.previous_balance)}
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
            C: {formatCurrency(transaction.new_balance)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            W: {transaction.new_winning_balance && !isNaN(parseFloat(transaction.new_winning_balance))
              ? formatCurrency(transaction.new_winning_balance)
              : formatCurrency('0')}
          </div>
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
      <TableCell className="text-right">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewClick}
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
}, (prevProps, nextProps) => {
  return (
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.transaction.status === nextProps.transaction.status &&
    prevProps.transaction.amount === nextProps.transaction.amount &&
    prevProps.transaction.updated_at === nextProps.transaction.updated_at &&
    prevProps.transaction.updated === nextProps.transaction.updated &&
    prevProps.onView === nextProps.onView
  );
});

interface TransactionCardProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
}

const TransactionCard = memo(function TransactionCard({ transaction, onView }: TransactionCardProps) {
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

  const handleViewClick = useCallback(() => {
    onView(transaction);
  }, [transaction, onView]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {transaction.user_username}
                </h3>
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

      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
            <div className="text-[10px] text-blue-700 dark:text-blue-300 uppercase mb-0.5 font-medium">Previous Credit</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(transaction.previous_balance)}
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
              {formatCurrency(transaction.new_balance)}
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
          onClick={handleViewClick}
          className="px-3 py-1.5 text-xs touch-manipulation shrink-0"
        >
          View
        </Button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.transaction.status === nextProps.transaction.status &&
    prevProps.transaction.amount === nextProps.transaction.amount &&
    prevProps.onView === nextProps.onView
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
