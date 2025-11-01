'use client';

import { useEffect, useState } from 'react';
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
  GameActionForm,
  LoadingState,
  ErrorState,
  EmptyState
} from '@/components/features';
import { 
  useTransactionsStore, 
  useTransactionQueuesStore 
} from '@/stores';
import type { Transaction, TransactionQueue, GameActionType } from '@/types';

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

  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    currentPage: transactionsPage,
    fetchTransactions,
    setPage: setTransactionsPage,
    setFilter: setTransactionsFilter,
  } = useTransactionsStore();

  const {
    queues,
    isLoading: queuesLoading,
    error: queuesError,
    currentPage: queuesPage,
    setPage: setQueuesPage,
    setFilter: setQueuesFilter,
    handleGameAction,
    actionLoading,
  } = useTransactionQueuesStore();

  useEffect(() => {
    if (viewType === 'purchases') {
      setTransactionsFilter('purchases');
    } else if (viewType === 'cashouts') {
      setTransactionsFilter('cashouts');
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

  const isLoading = viewType === 'game_activities' ? queuesLoading : transactionsLoading;
  const error = viewType === 'game_activities' ? queuesError : transactionsError;

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  const renderTransactions = () => {
    if (!transactions?.results || transactions.results.length === 0) {
      return (
        <EmptyState 
          title="No Transactions Found" 
          description="No transactions match the current filter." 
        />
      );
    }

    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.results.map((transaction: Transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.id}</TableCell>
                  <TableCell>{transaction.user_username}</TableCell>
                  <TableCell className="capitalize">{transaction.type}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(transaction.status)}>
                      {transaction.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.amount}</TableCell>
                  <TableCell>{transaction.payment_method}</TableCell>
                  <TableCell>{new Date(transaction.created).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {transactions.count > 10 && (
          <div className="mt-4">
            <Pagination
              currentPage={transactionsPage}
              totalPages={Math.ceil(transactions.count / 10)}
              hasNext={!!transactions.next}
              hasPrevious={!!transactions.previous}
              onPageChange={setTransactionsPage}
            />
          </div>
        )}
      </>
    );
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
      return (
        <EmptyState 
          title="No Transaction Queues Found" 
          description="No transaction queues match the current filter." 
        />
      );
    }

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
                  <TableCell>{queue.amount}</TableCell>
                  <TableCell>{queue.user_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          handleQuickAction(queue, e.target.value);
                          e.target.value = ''; // Reset dropdown
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
        
        {queues.count > 10 && (
          <div className="mt-4">
            <Pagination
              currentPage={queuesPage}
              totalPages={Math.ceil(queues.count / 10)}
              hasNext={!!queues.next}
              hasPrevious={!!queues.previous}
              onPageChange={setQueuesPage}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      {viewType === 'game_activities' && (
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
      )}

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && (
        viewType === 'game_activities' ? renderQueues() : renderTransactions()
      )}

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
    </div>
  );
}

