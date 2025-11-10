'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DashboardSectionContainer,
  DashboardSectionHeader,
} from '@/components/dashboard/layout';
import { Badge, Button, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@/components/ui';
import { EmptyState, TransactionDetailsModal } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionsStore } from '@/stores';
import { agentsApi, paymentMethodsApi, playersApi } from '@/lib/api';
import type { Agent, PaymentMethod, Player, Transaction } from '@/types';
import { HistoryTransactionsFilters, HistoryTransactionsFiltersState } from '@/components/dashboard/history/history-transactions-filters';

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
    date_from: advanced.date_from ?? '',
    date_to: advanced.date_to ?? '',
    amount_min: advanced.amount_min ?? '',
    amount_max: advanced.amount_max ?? '',
  };
}

export function TransactionsSection() {
  // Selective store subscriptions - only subscribe to what we need
  const transactions = useTransactionsStore((state) => state.transactions);
  const isLoading = useTransactionsStore((state) => state.isLoading);
  const error = useTransactionsStore((state) => state.error);
  const currentPage = useTransactionsStore((state) => state.currentPage);
  const pageSize = useTransactionsStore((state) => state.pageSize);
  const filter = useTransactionsStore((state) => state.filter);
  const advancedFilters = useTransactionsStore((state) => state.advancedFilters);
  const setPage = useTransactionsStore((state) => state.setPage);
  const fetchTransactions = useTransactionsStore((state) => state.fetchTransactions);
  const setAdvancedFilters = useTransactionsStore((state) => state.setAdvancedFilters);
  const clearAdvancedFilters = useTransactionsStore((state) => state.clearAdvancedFilters);
  const getStoreState = useTransactionsStore.getState;
  const { addToast } = useToast();

  const [filters, setFilters] = useState<HistoryTransactionsFiltersState>(() => buildHistoryFilterState(advancedFilters));
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [agentIdMap, setAgentIdMap] = useState<Map<string, number>>(new Map());
  const [isAgentLoading, setIsAgentLoading] = useState(false);
const [paymentMethodOptions, setPaymentMethodOptions] = useState<Array<{ value: string; label: string }>>([]);
const [isPaymentMethodLoading, setIsPaymentMethodLoading] = useState(false);
  const [usernameOptions, setUsernameOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isUsernameLoading, setIsUsernameLoading] = useState(false);
  const [usernameQuery, setUsernameQuery] = useState('');
  const usernameRequestIdRef = useRef(0);
  const agentFilterClearedRef = useRef<string | null>(null);

  // Fetch transactions when dependencies change
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filter, advancedFilters]);

  // Auto-clear agent filter if no transactions found for that agent
  useEffect(() => {
    // Check if we have an agent filter applied and the result is empty
    const currentAgent = advancedFilters.agent || advancedFilters.agent_id || '';
    const hasAgentFilter = Boolean(currentAgent);
    const hasNoResults = transactions?.count === 0;
    const isNotLoading = !isLoading;
    const notAlreadyCleared = agentFilterClearedRef.current !== currentAgent;
    
    if (hasAgentFilter && hasNoResults && isNotLoading && notAlreadyCleared) {
      console.log('🔍 No transactions found for agent filter, clearing filter to show all transactions');
      
      // Mark this agent filter as cleared to prevent infinite loop
      agentFilterClearedRef.current = currentAgent;
      
      // Show toast notification
      addToast({
        type: 'info',
        title: 'No transactions found',
        description: `No transactions found for agent "${advancedFilters.agent || 'selected agent'}". Showing all transactions instead.`,
      });
      
      // Clear agent filters to show all transactions
      const updatedFilters = { ...advancedFilters };
      delete updatedFilters.agent;
      delete updatedFilters.agent_id;
      setAdvancedFilters(updatedFilters);
    } else if (!hasAgentFilter) {
      // Reset the cleared ref when no agent filter is present
      agentFilterClearedRef.current = null;
    }
  }, [transactions, isLoading, advancedFilters, addToast, setAdvancedFilters]);

  // Sync filters with advanced filters and resolve agent/agent_id mappings
  useEffect(() => {
    const filterState = buildHistoryFilterState(advancedFilters);
    let needsUpdate = false;
    const updatedFilters = { ...advancedFilters };
    
    // If we have agent_id but no agent, try to resolve it from the agent map
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
    
    // If we have agent but no agent_id, try to resolve it from the agent map
    if (filterState.agent && !filterState.agent_id && agentIdMap.size > 0) {
      const agentId = agentIdMap.get(filterState.agent);
      if (agentId && advancedFilters.agent_id !== String(agentId)) {
        filterState.agent_id = String(agentId);
        updatedFilters.agent_id = String(agentId);
        needsUpdate = true;
      }
    }
    
    // Only update if we resolved a missing value
    if (needsUpdate) {
      setAdvancedFilters(updatedFilters);
    }
    
    setFilters(filterState);

    if (Object.keys(advancedFilters).length > 0) {
      setAreFiltersOpen(true);
    }
    if (advancedFilters.username) {
      setUsernameQuery(advancedFilters.username);
    }
  }, [advancedFilters, agentIdMap, setAdvancedFilters]);

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
        
        // After agents are loaded, if we have agent filter but no agent_id, resolve it
        if (isMounted && idMap.size > 0) {
          const currentFilters = getStoreState().advancedFilters;
          if (currentFilters.agent && !currentFilters.agent_id) {
            // Try exact match first
            let agentId = idMap.get(currentFilters.agent);
            
            // If not found, try case-insensitive match
            if (!agentId) {
              const agentKey = Array.from(idMap.keys()).find(
                (key) => key.toLowerCase() === currentFilters.agent.toLowerCase()
              );
              if (agentKey) {
                agentId = idMap.get(agentKey);
                // Update the agent name to the correct case
                console.log('🔍 Found agent with case-insensitive match:', currentFilters.agent, '→', agentKey);
              }
            }
            
            if (agentId) {
              console.log('🔍 Resolved agent_id for agent:', currentFilters.agent, '→', agentId);
              const updatedFilters: Record<string, string> = {
                ...currentFilters,
                agent_id: String(agentId),
              };
              // Update agent name if we found a case-insensitive match
              const agentKey = Array.from(idMap.keys()).find(
                (key) => idMap.get(key) === agentId
              );
              if (agentKey && agentKey !== currentFilters.agent) {
                updatedFilters.agent = agentKey;
                console.log('🔍 Updated agent name to match case:', agentKey);
              }
              setAdvancedFilters(updatedFilters);
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
      isMounted = false;
    };
  }, [setAdvancedFilters, getStoreState]);

  useEffect(() => {
    if (!usernameQuery || usernameQuery.trim().length < 2) {
      setUsernameOptions([]);
      setIsUsernameLoading(false);
      return;
    }

    setIsUsernameLoading(true);
    const requestId = ++usernameRequestIdRef.current;

    const timeoutId = setTimeout(async () => {
      try {
        const response = await playersApi.list({ search: usernameQuery.trim(), page: 1, page_size: 15 });

        if (usernameRequestIdRef.current !== requestId) {
          return;
        }

        const options = (response?.results ?? [])
          .filter((player): player is Player => Boolean(player?.username))
          .map((player) => ({
            value: player.username,
            label: player.email ? `${player.username} · ${player.email}` : player.username,
          }));

        setUsernameOptions(options);
      } catch (error) {
        if (usernameRequestIdRef.current === requestId) {
          console.error('Failed to load username suggestions:', error);
        }
      } finally {
        if (usernameRequestIdRef.current === requestId) {
          setIsUsernameLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [usernameQuery]);

  useEffect(() => {
    let isMounted = true;

    const loadPaymentMethods = async () => {
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
      isMounted = false;
    };
  }, []);

  const handleAdvancedFilterChange = useCallback((key: keyof HistoryTransactionsFiltersState, value: string) => {
    setFilters((previous) => {
      const updated = { ...previous, [key]: value };
      
      // When agent is changed, also update agent_id if we have a mapping
      if (key === 'agent') {
        const agentId = agentIdMap.get(value);
        if (agentId) {
          updated.agent_id = String(agentId);
        } else {
          updated.agent_id = '';
        }
      }
      
      // When agent_id is changed, try to find the corresponding agent username
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
      Object.entries(filters).filter(([, value]) => value.trim() !== '')
    ) as Record<string, string>;

    if (sanitized.type) {
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

    // Ensure both agent and agent_id are included if either is present
    // This ensures the API receives both parameters as expected: ?agent=agent2&agent_id=24
    if (sanitized.agent && !sanitized.agent_id) {
      const agentId = agentIdMap.get(sanitized.agent);
      if (agentId) {
        sanitized.agent_id = String(agentId);
      }
    }
    
    // If agent_id is provided but agent is not (e.g., from URL), keep agent_id
    // The agent username will be resolved when agents are loaded
    // Both parameters will be sent to API: ?agent_id=24 (and agent if resolved)

    setAdvancedFilters(sanitized);
  }, [filters, setAdvancedFilters, agentIdMap]);

  const handleClearAdvancedFilters = useCallback(() => {
    setFilters({ ...DEFAULT_HISTORY_FILTERS });
    clearAdvancedFilters();
  }, [clearAdvancedFilters]);

  const handleToggleAdvancedFilters = useCallback(() => {
    setAreFiltersOpen((previous) => !previous);
  }, []);

  const handleUsernameInputChange = useCallback((value: string) => {
    setUsernameQuery(value);
  }, []);

  const results = useMemo(() => transactions?.results ?? [], [transactions?.results]);
  const totalCount = useMemo(() => transactions?.count ?? 0, [transactions?.count]);
  const isInitialLoading = useMemo(() => isLoading && !transactions, [isLoading, transactions]);
  const isEmpty = useMemo(() => !results.length, [results.length]);

  return (
    <DashboardSectionContainer
      isLoading={isInitialLoading}
      error={error ?? ''}
      onRetry={fetchTransactions}
      isEmpty={isEmpty}
      emptyState={EMPTY_STATE}
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
        usernameOptions={usernameOptions}
        isUsernameLoading={isUsernameLoading}
        onUsernameInputChange={handleUsernameInputChange}
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
  usernameOptions: Array<{ value: string; label: string }>;
  isUsernameLoading: boolean;
  onUsernameInputChange: (value: string) => void;
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
  usernameOptions,
  isUsernameLoading,
  onUsernameInputChange,
}: TransactionsLayoutProps) {
  const headingTitle = filter === 'history' ? 'Transactions History' : 'Transactions';
  const shouldShowFilterBadge = filter !== 'all' && filter !== 'history';

  return (
    <>
      <DashboardSectionHeader
        title={headingTitle}
        description="Comprehensive transaction management and analytics"
        icon={HEADER_ICON}
        badge={
          shouldShowFilterBadge ? (
            <Badge variant="info" className="uppercase tracking-wide">
              {formatFilterLabel(filter)}
            </Badge>
          ) : undefined
        }
      />
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
        usernameOptions={usernameOptions}
        isUsernameLoading={isUsernameLoading}
        onUsernameInputChange={onUsernameInputChange}
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

  if (!transactions.length) {
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
  // Memoize expensive computations
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

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created), [transaction.created]);
  const formattedUpdatedAt = useMemo(() => formatDate(transaction.updated), [transaction.updated]);

  const handleViewClick = useCallback(() => {
    onView(transaction);
  }, [transaction, onView]);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
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
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{formattedCreatedAt}</div>
          <div>{formattedUpdatedAt}</div>
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
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.transaction.status === nextProps.transaction.status &&
    prevProps.transaction.amount === nextProps.transaction.amount &&
    prevProps.transaction.updated === nextProps.transaction.updated &&
    prevProps.onView === nextProps.onView
  );
});

// Memoize pure functions
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
