'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { 
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge, 
  Button, 
  Modal,
  Pagination
} from '@/components/ui';
import {
  DashboardActionBar,
  DashboardSectionContainer,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardStatGrid,
} from '@/components/dashboard/layout';
import { 
  GameActionForm,
  EmptyState
} from '@/components/features';
import { 
  useTransactionsStore, 
  useTransactionQueuesStore 
} from '@/stores';
import type { Transaction, TransactionQueue, GameActionType } from '@/types';
import { PROJECT_DOMAIN } from '@/lib/constants/api';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

type ViewType = 'purchases' | 'cashouts' | 'game_activities';
type QueueFilterType = 'processing' | 'history' | 'recharge_game' | 'redeem_game' | 'add_user_game';

interface TransactionFiltersState {
  agent?: string;
  username?: string;
  email?: string;
  transaction_id?: string;
  operator?: string;
  type?: string;
  payment_method?: string;
  status?: string;
  role?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
}

interface ProcessingSectionProps {
  type: ViewType;
}

const PURCHASE_ICON: JSX.Element = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 11H6L5 9z" />
  </svg>
);

const CASHOUT_ICON: JSX.Element = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8m-6 0a10 10 0 1020 0 10 10 0 00-20 0z" />
  </svg>
);

const GAME_ICON: JSX.Element = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-4 4h2M7 20l1-4h8l1 4M6 8h12l2 4-2 4H6L4 12l2-4zM9 4h6l1 4H8l1-4z" />
  </svg>
);

const CRYPTO_PAYMENT_METHODS = ['bitcoin', 'litecoin', 'bitcoin_lightning', 'crypto'];

const PROCESSING_CONFIG: Record<ViewType, {
  title: string;
  description: string;
  icon: JSX.Element;
  hint: string;
  emptyTitle: string;
  emptyDescription: string;
}> = {
  purchases: {
    title: 'Purchase Processing',
    description: 'Review, approve, or escalate pending purchase transactions.',
    icon: PURCHASE_ICON,
    hint: 'Only pending purchase transactions appear here. Resolve each request promptly to keep player balances accurate.',
    emptyTitle: 'No purchase transactions pending',
    emptyDescription: 'All purchase requests have been processed. New requests will appear automatically.',
  },
  cashouts: {
    title: 'Cashout Processing',
    description: 'Confirm player cashout requests and ensure payouts are delivered.',
    icon: CASHOUT_ICON,
    hint: 'Keep an eye on outstanding cashout requests and verify payout details before completing them.',
    emptyTitle: 'No cashout transactions pending',
    emptyDescription: 'There are no cashout requests waiting for approval right now.',
  },
  game_activities: {
    title: 'Game Activities Processing',
    description: 'Manage queued game actions such as recharge, redeem, and user additions.',
    icon: GAME_ICON,
    hint: 'Use filters to focus on specific game queues and resolve player-impacting tasks quickly.',
    emptyTitle: 'No game activities pending',
    emptyDescription: 'The game activity queue is currently empty. New items will show up here when they arrive.',
  },
};

type ProcessingStat = {
  title: string;
  value: string;
  helper?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon: JSX.Element;
};

function ProcessingTransactionsStats({ stats }: { stats: ProcessingStat[] }) {
  if (!stats.length) {
    return null;
  }

  return (
    <DashboardStatGrid>
      {stats.map((stat) => (
        <DashboardStatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          helperText={stat.helper}
          icon={stat.icon}
          variant={stat.variant}
        />
      ))}
    </DashboardStatGrid>
  );
}

interface ProcessingTransactionRowProps {
  transaction: Transaction;
  getStatusVariant: (status: string) => 'success' | 'warning' | 'danger' | 'info';
  onComplete: () => Promise<void>;
  onCancel: () => Promise<void>;
  isActionPending: boolean;
}

function ProcessingTransactionRow({ transaction, getStatusVariant, onComplete, onCancel, isActionPending }: ProcessingTransactionRowProps) {
  const bonusValue = parseFloat(transaction.bonus_amount || '0');
  const transactionId = transaction.unique_id ?? transaction.id;
  const paymentMethod = transaction.payment_method ?? '—';
  const lowerPaymentMethod = paymentMethod.toLowerCase();
  const isCryptoPayment = CRYPTO_PAYMENT_METHODS.some((method) => lowerPaymentMethod.includes(method));
  const invoiceUrl = transaction.invoice_url
    ? transaction.invoice_url
    : transaction.id
      ? `${(process.env.NEXT_PUBLIC_API_URL ?? PROJECT_DOMAIN).replace(/\/$/, '')}/api/v1/transactions/${transaction.id}/invoice/`
      : undefined;
  const isPending = transaction.status === 'pending';
  const disableActions = isActionPending || !isPending;

  return (
    <TableRow>
      <TableCell>
        <code className="text-xs text-muted-foreground">{transactionId}</code>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium text-foreground">{transaction.user_username ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{transaction.user_email ?? '—'}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium text-foreground">{transaction.description ?? '—'}</div>
          <Badge variant={transaction.type === 'purchase' ? 'success' : 'warning'} className="text-xs">
            {transaction.type?.toUpperCase() ?? '—'}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-semibold text-foreground">{formatCurrency(transaction.amount || '0')}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">
          {bonusValue !== 0 ? formatCurrency(bonusValue) : '—'}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">{formatCurrency(transaction.previous_balance || '0')}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-semibold text-foreground">{formatCurrency(transaction.new_balance || '0')}</div>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(transaction.status)} className="capitalize">
          {transaction.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="info" className="capitalize">
          {paymentMethod}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground">{formatDate(transaction.created)}</div>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex flex-wrap items-center justify-end gap-2">
          {isCryptoPayment && invoiceUrl ? (
            <Button
              variant="secondary"
              size="sm"
              className="font-medium"
              onClick={() => window.open(invoiceUrl, '_blank', 'noopener,noreferrer')}
              disabled={isActionPending}
            >
              View Invoice
            </Button>
          ) : null}
          {isPending ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="font-medium"
                onClick={() => void onComplete()}
                disabled={disableActions}
              >
                Complete
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="font-medium"
                onClick={() => void onCancel()}
                disabled={disableActions}
              >
                Cancel
              </Button>
            </>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function buildProcessingTransactionStats(transactions: Transaction[], totalCount: number): ProcessingStat[] {
  const queueSize = totalCount || transactions.length;

  if (!queueSize) {
    return [];
  }

  const pending = transactions.filter((tx) => tx.status === 'pending').length;
  const completed = transactions.filter((tx) => tx.status === 'completed').length;
  const cancelled = transactions.filter((tx) => tx.status === 'cancelled').length;
  const volume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
  const bonuses = transactions.reduce((sum, tx) => sum + parseFloat(tx.bonus_amount || '0'), 0);

  const percentage = (count: number) => (queueSize ? Math.round((count / queueSize) * 100) : 0);

  return [
    {
      title: 'Queue Size',
      value: queueSize.toLocaleString(),
      helper: `Volume ${formatCurrency(volume)} · Bonuses ${formatCurrency(bonuses)}`,
      variant: 'info',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-6 4h6m-6 4h6m-9 4h12" />
        </svg>
      ),
    },
    {
      title: 'Pending',
      value: pending.toLocaleString(),
      helper: `${percentage(pending)}% of queue`,
      variant: 'warning',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
        </svg>
      ),
    },
    {
      title: 'Completed',
      value: completed.toLocaleString(),
      helper: `${percentage(completed)}% resolved`,
      variant: 'success',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      title: 'Cancelled',
      value: cancelled.toLocaleString(),
      helper: `${percentage(cancelled)}% rejected`,
      variant: 'danger',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  ];
}

export function ProcessingSection({ type }: ProcessingSectionProps) {
  const viewType = type;
  const [queueFilter, setQueueFilter] = useState<QueueFilterType>('processing');
  const [selectedQueue, setSelectedQueue] = useState<TransactionQueue | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFiltersState>({
    agent: '',
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
  });

  const isTransactionsView = viewType === 'purchases' || viewType === 'cashouts';
  const metadata = PROCESSING_CONFIG[viewType];
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);

  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    currentPage: transactionsPage,
    pageSize: transactionsPageSize,
    fetchTransactions,
    setPage: setTransactionsPage,
    setFilter: setTransactionsFilter,
    updateTransactionStatus,
  } = useTransactionsStore();

  const {
    queues,
    isLoading: queuesLoading,
    error: queuesError,
    currentPage: queuesPage,
    pageSize: queuesPageSize,
    setPage: setQueuesPage,
    setFilter: setQueuesFilter,
    handleGameAction,
    actionLoading,
    fetchQueues,
  } = useTransactionQueuesStore();

  const transactionResults = useMemo<Transaction[]>(
    () => transactions?.results ?? [],
    [transactions?.results]
  );
  const transactionCount = transactions?.count ?? 0;
  const transactionStats = useMemo(() => buildProcessingTransactionStats(transactionResults, transactionCount), [transactionResults, transactionCount]);

  useEffect(() => {
    if (viewType === 'purchases') {
      setTransactionsFilter('pending-purchases');
    } else if (viewType === 'cashouts') {
      setTransactionsFilter('pending-cashouts');
    } else {
      setQueuesFilter(queueFilter);
    }
  }, [viewType, queueFilter, setTransactionsFilter, setQueuesFilter]);

  const handleFilterChange = (key: keyof TransactionFiltersState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleQueueFilterChange = (filter: QueueFilterType) => {
    setQueueFilter(filter);
    setQueuesFilter(filter);
  };

  const handleTransactionAction = async (transactionId: string, status: 'completed' | 'cancelled') => {
    try {
      setPendingTransactionId(transactionId);
      await updateTransactionStatus({ id: transactionId, status });
    } catch (error) {
      console.error('Failed to update transaction status:', error);
    } finally {
      setPendingTransactionId(null);
    }
  };

  const handleActionClick = (queue: TransactionQueue) => {
    setSelectedQueue(queue);
    setIsActionModalOpen(true);
  };

  const handleActionSubmit = async (data: Parameters<typeof handleGameAction>[0]) => {
    try {
      await handleGameAction(data);
      setIsActionModalOpen(false);
      setSelectedQueue(null);
    } catch (error) {
      console.error('Failed to process game action:', error);
    }
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  const handleQuickAction = async (queue: TransactionQueue, action: string) => {
    if (action === 'complete') {
      // For complete, open modal with form
      handleActionClick(queue);
      return;
    }

    if (!action) return;

    try {
      await handleGameAction({
        txn_id: queue.id,
        type: action as GameActionType,
      });
    } catch (error) {
      console.error('Failed to process quick action:', error);
    }
  };

  const renderQueues = () => {
    if (!queues?.results || queues.results.length === 0) {
      return null;
    }

    const totalCount = queues.count ?? 0;

    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.results.map((queue: TransactionQueue) => (
                <TableRow key={queue.id}>
                  <TableCell>{queue.id}</TableCell>
                  <TableCell className="capitalize">{queue.type.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(queue.status)}>
                      {queue.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{queue.game}</TableCell>
                  <TableCell>{formatCurrency(queue.amount || '0')}</TableCell>
                  <TableCell>{queue.user_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          handleQuickAction(queue, e.target.value);
                          e.target.value = '';
                        }}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-sm font-medium border-2 rounded-lg transition-all cursor-pointer
                          bg-white dark:bg-gray-800 
                          border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-gray-100
                          hover:border-blue-500 dark:hover:border-blue-400
                          focus:border-blue-500 dark:focus:border-blue-400 
                          focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20
                          disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">⚡ Action</option>
                        <option value="retry" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">🔄 Retry</option>
                        <option value="cancel" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">❌ Cancel</option>
                        <option value="complete" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">✅ Complete</option>
                      </select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalCount > queuesPageSize && (
          <div className="mt-4">
            <Pagination
              currentPage={queuesPage}
              totalPages={Math.ceil(totalCount / queuesPageSize)}
              hasNext={!!queues.next}
              hasPrevious={!!queues.previous}
              onPageChange={setQueuesPage}
            />
          </div>
        )}
      </>
    );
  };

  if (isTransactionsView) {
    const isInitialLoading = transactionsLoading && !transactions;
    const isEmpty = transactionResults.length === 0;
    const emptyState = (
      <EmptyState
        title={metadata.emptyTitle}
        description={metadata.emptyDescription}
      />
    );

    return (
      <DashboardSectionContainer
        isLoading={isInitialLoading}
        error={transactionsError ?? ''}
        onRetry={fetchTransactions}
        isEmpty={isEmpty}
        emptyState={emptyState}
      >
        <DashboardSectionHeader
          title={metadata.title}
          description={metadata.description}
          icon={metadata.icon}
        />
        <DashboardActionBar>
          <p className="text-sm text-muted-foreground">
            {metadata.hint}
          </p>
        </DashboardActionBar>
        <ProcessingTransactionsStats stats={transactionStats} />
        {transactionResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tx ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Previous Balance</TableHead>
                  <TableHead>New Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionResults.map((transaction) => (
                  <ProcessingTransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    getStatusVariant={getStatusVariant}
                  onComplete={() => handleTransactionAction(transaction.id, 'completed')}
                  onCancel={() => handleTransactionAction(transaction.id, 'cancelled')}
                  isActionPending={pendingTransactionId === transaction.id}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {transactionCount > transactionsPageSize && (
          <div className="mt-4">
            <Pagination
              currentPage={transactionsPage}
              totalPages={Math.ceil(transactionCount / transactionsPageSize)}
              hasNext={!!transactions?.next}
              hasPrevious={!!transactions?.previous}
              onPageChange={setTransactionsPage}
            />
          </div>
        )}
      </DashboardSectionContainer>
    );
  }

  const isGameInitialLoading = queuesLoading && !queues;
  const gameResults = queues?.results ?? [];
  const isGameEmpty = gameResults.length === 0;
  const gameEmptyState = (
    <EmptyState
      title={metadata.emptyTitle}
      description={metadata.emptyDescription}
    />
  );

  return (
    <>
      <DashboardSectionContainer
        isLoading={isGameInitialLoading}
        error={queuesError ?? ''}
        onRetry={fetchQueues}
        isEmpty={isGameEmpty}
        emptyState={gameEmptyState}
      >
        <DashboardSectionHeader
          title={metadata.title}
          description={metadata.description}
          icon={metadata.icon}
        />
        <DashboardActionBar>
          <p className="text-sm text-muted-foreground">{metadata.hint}</p>
        </DashboardActionBar>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-black/20 p-4 space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 transition-colors">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              {showFilters ? (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Hide Filters
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show Filters
                </>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800 transition-colors">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Queue Type
                </label>
                <select
                  value={queueFilter}
                  onChange={(e) => handleQueueFilterChange(e.target.value as QueueFilterType)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="processing">Processing</option>
                  <option value="history">History</option>
                  <option value="recharge_game">Recharge Game</option>
                  <option value="redeem_game">Redeem Game</option>
                  <option value="add_user_game">Add User Game</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  User ID
                </label>
                <input
                  type="number"
                  value={filters.username || ''}
                  onChange={(e) => handleFilterChange('username', e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>

        {renderQueues()}
      </DashboardSectionContainer>
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setSelectedQueue(null);
        }}
        title="Manage Transaction Queue"
      >
        <GameActionForm
          queue={selectedQueue}
          onSubmit={handleActionSubmit}
          onCancel={() => {
            setIsActionModalOpen(false);
            setSelectedQueue(null);
          }}
        />
      </Modal>
    </>
  );
}

