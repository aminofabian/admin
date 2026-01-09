'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge, 
  Button, 
  Pagination,
  Skeleton
} from '@/components/ui';
import {
  DashboardActionBar,
  DashboardSectionContainer,
} from '@/components/dashboard/layout';
import { 
  EmptyState,
  TransactionDetailsModal
} from '@/components/features';
import { ActionModal } from './action-modal/game-activity-history';
import { GameActivityTable } from './game-activity-table';
import { 
  useTransactionsStore, 
  useTransactionQueuesStore 
} from '@/stores';
import type { Transaction, TransactionQueue, GameActionType } from '@/types';
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/utils/formatters';
import { transactionsApi } from '@/lib/api/transactions';
import type { ApiError } from '@/types';
import { useToast, ConfirmModal } from '@/components/ui';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';

type ViewType = 'purchases' | 'cashouts' | 'game_activities';
type QueueFilterType = 'processing' | 'history' | 'recharge_game' | 'redeem_game' | 'add_user_game' | 'create_game';

interface ProcessingSectionProps {
  type: ViewType;
}

// Skeleton loaders for better UX
function ProcessingTransactionTableSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header Skeleton */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
          <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-48 shrink-0" />
          <div className="flex-1 min-w-0" />
          <Skeleton className="h-8 w-32 rounded-lg shrink-0" />
        </div>
      </div>

      {/* Hint bar skeleton */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <Skeleton className="h-4 w-full" />
      </div>
      
      {/* Table skeleton */}
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
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-9 gap-4 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Pagination skeleton */}
      <div className="flex justify-center gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-10 rounded-md" />
        ))}
      </div>
    </div>
  );
}

function ProcessingQueueTableSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header Skeleton */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
          <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-48 shrink-0" />
          <div className="flex-1 min-w-0" />
          <Skeleton className="h-8 w-32 rounded-lg shrink-0" />
        </div>
      </div>

      {/* Hint bar skeleton */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <Skeleton className="h-4 w-full" />
      </div>

      {/* Table skeleton */}
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
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-9 gap-4 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-32" />
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
    hint: '',
    emptyTitle: 'No purchase transactions pending',
    emptyDescription: 'All purchase requests have been processed. New requests will appear automatically.',
  },
  cashouts: {
    title: 'Cashout Processing',
    description: 'Confirm player cashout requests and ensure payouts are delivered.',
    icon: CASHOUT_ICON,
    hint: '',
    emptyTitle: 'All Clear',
    emptyDescription: 'No pending cashout requests. New requests will appear here automatically.',
  },
  game_activities: {
    title: 'Game Activities Processing',
    description: 'Manage queued game actions such as recharge, redeem, and user additions.',
    icon: GAME_ICON,
    hint: '',
    emptyTitle: 'No game activities pending',
    emptyDescription: 'The game activity queue is currently empty. New items will show up here when they arrive.',
  },
};

interface ProcessingTransactionRowProps {
  transaction: Transaction;
  getStatusVariant: (status: string) => 'success' | 'warning' | 'danger' | 'info';
  onView: () => void;
  isActionPending: boolean;
}

function ProcessingTransactionRow({ transaction, getStatusVariant, onView, isActionPending }: ProcessingTransactionRowProps) {
  const router = useRouter();
  const bonusValue = parseFloat(transaction.bonus_amount || '0');
  const paymentMethod = transaction.payment_method ?? '—';

  const isPurchase = transaction.type === 'purchase';
  const statusVariant = getStatusVariant(transaction.status);

  const handleOpenDetails = useCallback(() => {
    onView();
  }, [onView]);

  const userCell = (
    <TableCell>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleOpenDetails}
          className="flex-shrink-0 touch-manipulation"
          title="View transaction details"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
            {transaction.user_username?.charAt(0).toUpperCase() ?? '?'}
          </div>
        </button>
        <div>
          <button
            type="button"
            onClick={handleOpenDetails}
            className="text-left touch-manipulation"
            title="View transaction details"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{transaction.user_username ?? '—'}</div>
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400">{transaction.user_email ?? '—'}</div>
        </div>
      </div>
    </TableCell>
  );

  const typeVariant = isPurchase ? 'success' : 'danger';

  const transactionCell = (
    <TableCell>
      <Badge variant={typeVariant} className="text-xs uppercase">
        {transaction.type ?? '—'}
      </Badge>
    </TableCell>
  );

  const formattedAmount = formatCurrency(transaction.amount || '0');
  const formattedBonus = bonusValue !== 0 ? formatCurrency(String(bonusValue)) : null;
  const amountColorClass = isPurchase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const bonusColorClass = isPurchase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  const amountCell = (
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
  );

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

  const creditCell = (
    <TableCell>
      <div className={`text-xs ${creditColorClass}`}>
        {creditDisplayText}
      </div>
    </TableCell>
  );

  const winningCell = (
    <TableCell>
      <div className={`text-xs ${winningColorClass}`}>
        {winningDisplayText}
      </div>
    </TableCell>
  );

  const statusCell = (
    <TableCell>
      <Badge variant={statusVariant} className="capitalize">
        {transaction.status}
      </Badge>
    </TableCell>
  );

  const paymentCell = (
    <TableCell>
      <div className="space-y-1">
        <Badge variant="info" className="text-xs">
          {formatPaymentMethod(paymentMethod)}
        </Badge>
        {transaction.payment_details && typeof transaction.payment_details === 'object' && Object.keys(transaction.payment_details).length > 0 && (
          <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
            {Object.entries(transaction.payment_details).map(([key, value]) => (
              <div key={key} className="truncate" title={`${key.replace(/_/g, ' ')}: ${typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value)}`}>
                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                <span className="text-gray-700 dark:text-gray-300">
                  {typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TableCell>
  );

  const datesCell = (
    <TableCell>
      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <div>{transaction.created_at ? formatDate(transaction.created_at) : '—'}</div>
        <div>{transaction.updated_at ? formatDate(transaction.updated_at) : '—'}</div>
      </div>
    </TableCell>
  );

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {userCell}
      {transactionCell}
      {amountCell}
      {creditCell}
      {winningCell}
      {statusCell}
      {paymentCell}
      {datesCell}
    </TableRow>
  );
}

const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status.toLowerCase()) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'failed': case 'cancelled': return 'danger';
    default: return 'info';
  }
};

export function ProcessingSection({ type }: ProcessingSectionProps) {
  const router = useRouter();
  const viewType = type;
  const [queueFilter] = useState<QueueFilterType>('processing');
  const [selectedQueue, setSelectedQueue] = useState<TransactionQueue | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { addToast } = useToast();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    transaction: Transaction | null;
    action: 'completed' | 'cancelled' | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    transaction: null,
    action: null,
    isLoading: false,
  });

  const isTransactionsView = viewType === 'purchases' || viewType === 'cashouts';
  const isGameActivitiesView = viewType === 'game_activities';
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
    updateTransaction,
  } = useTransactionsStore();

  const {
    queues,
    isLoading: queuesLoading,
    error: queuesError,
    setFilter: setQueuesFilter,
    handleGameAction,
    actionLoading,
    fetchQueues,
    updateQueue,
    count: queueCount,
    next: queueNext,
    previous: queuePrevious,
    currentPage: queuePage,
    pageSize: queuePageSize,
    setPage: setQueuePage,
  } = useTransactionQueuesStore();

  const { 
    isConnected: wsConnected, 
    isConnecting: wsConnecting, 
    error: wsError, 
    isUsingFallback,
    refreshData,
    subscribeToQueueUpdates, 
    subscribeToTransactionUpdates 
  } = useProcessingWebSocketContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual refresh handler for fallback mode
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      // Also refresh the stores
      if (isTransactionsView) {
        await fetchTransactions();
      } else {
        await fetchQueues();
      }
      addToast({
        type: 'success',
        title: 'Data Refreshed',
        description: 'Successfully refreshed data from server',
        duration: 2000,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Refresh Failed',
        description: 'Failed to refresh data. Please try again.',
        duration: 3000,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, isTransactionsView, fetchTransactions, fetchQueues, addToast]);

  useEffect(() => {
    const unsubscribeQueue = subscribeToQueueUpdates((updatedQueue: TransactionQueue, isInitialLoad = false) => {
      // Only handle queue updates for game activities
      if (!isGameActivitiesView) {
        console.log('⏭️ Skipping queue update - not in game activities view');
        return;
      }
      
      console.log('📨 Real-time queue update received:', updatedQueue);
      console.log('   Status:', updatedQueue.status);
      console.log('   ID:', updatedQueue.id);
      console.log('   Type:', updatedQueue.type);
      console.log('   IsInitialLoad:', isInitialLoad);
      console.log('   Current queues count:', queues?.length || 0);
      
      // Check if it's new BEFORE updating (using current state)
      const isNewActivity = !queues?.find(q => q.id === updatedQueue.id);
      console.log('   IsNewActivity:', isNewActivity);
      
      // Pass ALL updates to the store - it will handle the filtering logic:
      // - New completed items won't be added
      // - Existing items that become completed will be removed
      // - User data from API will be preserved when merging WebSocket updates
      // - New items will be appended to the beginning of the list
      updateQueue(updatedQueue);
      
      console.log('✅ updateQueue called for:', updatedQueue.id);
      
      // Don't show toasts during initial load (all_activities message)
      if (isInitialLoad) {
        return;
      }
      
      // Toast notifications are now handled globally by GlobalTransactionNotifications
      // component in the dashboard layout, so we don't show them here to avoid duplicates
      const statusLower = String(updatedQueue.status || '').toLowerCase();
      const isCompleted = statusLower === 'completed' || statusLower === 'complete';
      
      if (isNewActivity) {
        console.log('✅ New activity added to table:', updatedQueue.id);
      } else if (!isCompleted) {
        console.log('✅ Activity updated in table:', updatedQueue.id);
      } else {
        console.log('✅ Activity completed and removed:', updatedQueue.id);
      }
    });

    return unsubscribeQueue;
  }, [subscribeToQueueUpdates, updateQueue, addToast, queues, isGameActivitiesView]);

  useEffect(() => {
    const unsubscribeTransaction = subscribeToTransactionUpdates((updatedTransaction: Transaction, isInitialLoad = false) => {
      // Only handle transaction updates for purchases and cashouts
      if (isGameActivitiesView) return;
      
      // Filter by view type - only process transactions that match the current view
      if (viewType === 'purchases' && updatedTransaction.type !== 'purchase') {
        return; // Ignore non-purchase transactions in purchases view
      }
      if (viewType === 'cashouts' && updatedTransaction.type !== 'cashout') {
        return; // Ignore non-cashout transactions in cashouts view
      }
      
      console.log('📨 Real-time transaction update received:', updatedTransaction);
      console.log('   Status:', updatedTransaction.status);
      console.log('   ID:', updatedTransaction.id);
      console.log('   Type:', updatedTransaction.type);
      console.log('   IsInitialLoad:', isInitialLoad);
      
      // Check if it's new BEFORE updating (using current state)
      const currentTransactions = transactions?.results ?? [];
      const isNewTransaction = !currentTransactions.find(t => t.id === updatedTransaction.id);
      
      // Pass ALL updates to the store - it will handle the filtering logic:
      // - New completed items won't be added
      // - Existing items that become completed will be removed
      // - User data from API will be preserved when merging WebSocket updates
      // - New items will be appended to the beginning of the list
      updateTransaction(updatedTransaction);
      
      // Don't show toasts during initial load (all_activities message)
      if (isInitialLoad) {
        return;
      }
      
      // Toast notifications are now handled globally by GlobalTransactionNotifications
      // component in the dashboard layout, so we don't show them here to avoid duplicates
      const statusLower = String(updatedTransaction.status || '').toLowerCase();
      const isCompleted = statusLower === 'completed' || statusLower === 'complete' || statusLower === 'cancelled' || statusLower === 'failed';
      
      if (isNewTransaction) {
        console.log('✅ New transaction added to table:', updatedTransaction.id);
      } else if (!isCompleted) {
        console.log('✅ Transaction updated in table:', updatedTransaction.id);
      } else {
        console.log('✅ Transaction completed and removed:', updatedTransaction.id);
      }
    });

    return unsubscribeTransaction;
  }, [subscribeToTransactionUpdates, updateTransaction, addToast, transactions, isGameActivitiesView, viewType]);

  const transactionResults = useMemo<Transaction[]>(
    () => transactions?.results ?? [],
    [transactions?.results]
  );
  const transactionCount = transactions?.count ?? 0;

  useEffect(() => {
    if (viewType === 'purchases') {
      setTransactionsFilter('pending-purchases');
    } else if (viewType === 'cashouts') {
      setTransactionsFilter('pending-cashouts');
    } else {
      setQueuesFilter(queueFilter);
    }
  }, [viewType, queueFilter, setTransactionsFilter, setQueuesFilter]);


  const handleTransactionAction = async (
    transactionId: string, 
    action: 'completed' | 'cancelled',
    internalId?: string,
    transactionStatus?: string
  ) => {
    console.log('🔵 handleTransactionAction called:', { transactionId, action, internalId, transactionStatus });
    
    if (!transactionId || transactionId.trim() === '') {
      console.error('❌ Invalid transaction ID:', transactionId);
      addToast({
        type: 'error',
        title: 'Invalid Transaction ID',
        description: 'Transaction ID is missing or invalid',
      });
      return;
    }

    // Check if transaction is pending
    if (transactionStatus && transactionStatus !== 'pending') {
      console.error('❌ Transaction is not pending:', { transactionId, status: transactionStatus });
      addToast({
        type: 'error',
        title: 'Invalid Action',
        description: `Cannot ${action === 'completed' ? 'complete' : 'cancel'} a transaction that is already ${transactionStatus}.`,
        duration: 5000,
      });
      return;
    }

    try {
      // Use internal ID for tracking if provided, otherwise use transactionId
      setPendingTransactionId(internalId ?? transactionId);
      // Convert status to API action type
      const apiAction = action === 'completed' ? 'complete' : 'cancel';
      
      console.log('🔄 Transaction Action - About to call API:', { transactionId, action: apiAction });
      const response = await transactionsApi.transactionAction(transactionId, apiAction);
      console.log(' Transaction Action - API call successful:', response);
      
      // Refresh transactions after successful action
      await fetchTransactions();
      
      // Show success toast
      addToast({
        type: 'success',
        title: `Transaction ${action === 'completed' ? 'Completed' : 'Cancelled'}`,
        description: `Transaction ${action} successfully`,
        duration: 3000,
      });

      if (selectedTransaction?.id === transactionId) {
        setIsViewModalOpen(false);
        setSelectedTransaction(null);
      }
    } catch (error) {
      // Extract error message from ApiError object
      let errorMessage = 'Failed to update transaction status';
      
      if (error && typeof error === 'object') {
        const apiError = error as ApiError;
        errorMessage = apiError.message || apiError.detail || apiError.error || errorMessage;
        
        console.error('❌ Transaction Action Error:', {
          message: apiError.message,
          detail: apiError.detail,
          error: apiError.error,
          status: apiError.status,
          fullError: JSON.stringify(error, null, 2),
        });
      } else if (error instanceof Error) {
        errorMessage = error.message;
        console.error('❌ Transaction Action Error:', error.message);
      } else {
        console.error('❌ Transaction Action Error:', error);
      }
      
      // Display error to user using toast notification
      addToast({
        type: 'error',
        title: 'Transaction Action Failed',
        description: errorMessage,
        duration: 6000,
      });
      
      // Don't re-throw - error is already handled and displayed to user
      // Re-throwing causes "Uncaught (in promise)" warnings
    } finally {
      setPendingTransactionId(null);
    }
  };

  const shouldConfirmTransactionAction = (transaction: Transaction): boolean => {
    if (transaction.status !== 'pending') {
      return false;
    }

    if (viewType === 'purchases') {
      return transaction.type === 'purchase';
    }

    if (viewType === 'cashouts') {
      return transaction.type === 'cashout';
    }

    return false;
  };

  const handleTransactionActionClick = (transaction: Transaction, action: 'completed' | 'cancelled') => {
    if (shouldConfirmTransactionAction(transaction)) {
      setConfirmModal({
        isOpen: true,
        transaction,
        action,
        isLoading: false,
      });
      return;
    }

    void handleTransactionAction(
      transaction.id,
      action,
      transaction.id,
      transaction.status
    );
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.transaction || !confirmModal.action) return;

    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      await handleTransactionAction(
        confirmModal.transaction.id,
        confirmModal.action,
        confirmModal.transaction.id,
        confirmModal.transaction.status
      );
      setConfirmModal({ isOpen: false, transaction: null, action: null, isLoading: false });
    } catch {
      // Error is already handled in handleTransactionAction
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelConfirm = () => {
    setConfirmModal({ isOpen: false, transaction: null, action: null, isLoading: false });
  };

  const handleActionClick = useCallback((queue: TransactionQueue) => {
    setSelectedQueue(queue);
    setIsActionModalOpen(true);
  }, []);

  const handleActionSubmit = async (data: Parameters<typeof handleGameAction>[0]) => {
    await handleGameAction(data);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedTransaction(null);
  };

const handleTransactionDetailsAction = (action: 'completed' | 'cancelled') => {
  if (!selectedTransaction) {
    return;
  }

  handleTransactionActionClick(selectedTransaction, action);
};

  const handleQuickAction = useCallback(async (queue: TransactionQueue, action: string) => {
    if (action === 'view') {
      // Open modal to View and select action
      handleActionClick(queue);
      return;
    }

    if (!action) return;

    try {
      await handleGameAction({
        txn_id: queue.id,
        type: action as GameActionType,
      });
      
      // Show success toast
      addToast({
        type: 'success',
        title: 'Action Successful',
        description: `Queue item ${action === 'retry' ? 'retried' : action === 'cancel' ? 'cancelled' : 'completed'} successfully`,
        duration: 3000,
      });
    } catch (error) {
      // Extract error message
      let errorMessage = 'Failed to process action';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('Failed to process quick action:', error);
      
      // Show error toast
      addToast({
        type: 'error',
        title: 'Action Failed',
        description: errorMessage,
        duration: 6000,
      });
    }
  }, [handleGameAction, addToast, handleActionClick]);

  const handleQueuePageChange = useCallback((page: number) => {
    if (page === queuePage) {
      return;
    }
    void setQueuePage(page);
  }, [queuePage, setQueuePage]);

  const handleViewGameActivity = useCallback((queue: TransactionQueue) => {
    handleQuickAction(queue, 'view');
  }, [handleQuickAction]);

  if (isTransactionsView) {
    const isInitialLoading = transactionsLoading;
    const isEmpty = transactionResults.length === 0 && !transactionsLoading;
    // Custom empty state for cashouts and purchases with theme styling
    const emptyState = viewType === 'cashouts' ? (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-purple-gradient-500/20 dark:bg-purple-gradient-500/10 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-purple-gradient-50 to-purple-gradient-100 dark:from-purple-gradient-900/30 dark:to-purple-gradient-800/30 rounded-full p-6 backdrop-blur-sm">
            <svg 
              className="w-16 h-16 text-purple-gradient-600 dark:text-purple-gradient-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-gradient-600 to-purple-gradient-500 dark:from-purple-gradient-400 dark:to-purple-gradient-300 bg-clip-text text-transparent">
            {metadata.emptyTitle}
          </h3>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">{metadata.emptyDescription}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <div className="h-2 w-2 bg-purple-gradient-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 bg-purple-gradient-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 bg-purple-gradient-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    ) : viewType === 'purchases' ? (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-purple-gradient-500/20 dark:bg-purple-gradient-500/10 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-purple-gradient-50 to-purple-gradient-100 dark:from-purple-gradient-900/30 dark:to-purple-gradient-800/30 rounded-full p-6 backdrop-blur-sm">
            <svg 
              className="w-16 h-16 text-purple-gradient-600 dark:text-purple-gradient-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-gradient-600 to-purple-gradient-500 dark:from-purple-gradient-400 dark:to-purple-gradient-300 bg-clip-text text-transparent">
            {metadata.emptyTitle}
          </h3>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">{metadata.emptyDescription}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <div className="h-2 w-2 bg-purple-gradient-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 bg-purple-gradient-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 bg-purple-gradient-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    ) : (
      <EmptyState
        title={metadata.emptyTitle}
        description={metadata.emptyDescription}
      />
    );

    const confirmTransaction = confirmModal.transaction;
    const confirmAction = confirmModal.action;
    const transactionTypeLabel = confirmTransaction?.type
      ? `${confirmTransaction.type.charAt(0).toUpperCase()}${confirmTransaction.type.slice(1)}`
      : 'Transaction';
    const actionLabel = confirmAction === 'completed'
      ? 'Complete'
      : confirmAction === 'cancelled'
        ? 'Cancel'
        : 'Confirm';
    const actionVerb = confirmAction === 'completed'
      ? 'complete'
      : confirmAction === 'cancelled'
        ? 'cancel'
        : 'process';
    const confirmTitle = confirmTransaction
      ? `${actionLabel} ${transactionTypeLabel} Transaction`
      : 'Confirm Transaction Action';
    const confirmDescription = confirmTransaction
      ? `Are you sure you want to ${actionVerb} this ${transactionTypeLabel.toLowerCase()} for ${formatCurrency(confirmTransaction.amount || '0')}?`
      : '';
    const confirmVariant = confirmAction === 'cancelled' ? 'warning' : 'info';
    const confirmButtonText = actionLabel;

    return (
      <>
        <DashboardSectionContainer
          isLoading={isInitialLoading}
          loadingState={<ProcessingTransactionTableSkeleton />}
          error={transactionsError ?? ''}
          onRetry={fetchTransactions}
          isEmpty={isEmpty}
          emptyState={emptyState}
        >
        {/* Compact Header */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            {/* Icon */}
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
              <div className="h-4 w-4 sm:h-5 sm:w-5 text-white">
                {metadata.icon}
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
              {metadata.title}
            </h2>
            
            {/* Spacer */}
            <div className="flex-1 min-w-0" />
            
            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                {wsConnecting && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground">Connecting...</span>
                  </>
                )}
                {wsConnected && !wsConnecting && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Live Updates Active</span>
                  </>
                )}
                {isUsingFallback && !wsConnected && !wsConnecting && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400">API Mode (Auto-refresh)</span>
                  </>
                )}
                {!wsConnected && !wsConnecting && !isUsingFallback && wsError && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">Offline</span>
                  </>
                )}
                {!wsConnected && !wsConnecting && !isUsingFallback && !wsError && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-xs font-medium text-muted-foreground">Disconnected</span>
                  </>
                )}
              </div>
              {/* Refresh button - always visible, but highlighted in fallback mode */}
              <Button
                variant={isUsingFallback ? "primary" : "ghost"}
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={isUsingFallback ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                title={isUsingFallback ? "Refresh data (WebSocket unavailable)" : "Refresh data"}
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        {metadata.hint && (
          <DashboardActionBar>
            <p className="text-sm text-muted-foreground">
              {metadata.hint}
            </p>
          </DashboardActionBar>
        )}
        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {transactionResults.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                title="No Transactions found" 
                description="Try adjusting your filters or search criteria"
              />
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
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
                      <ProcessingTransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        getStatusVariant={getStatusVariant}
                        onView={() => handleViewTransaction(transaction)}
                        isActionPending={pendingTransactionId === transaction.id}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
            {transactionResults.map((transaction) => {
              const isPurchaseTransaction = transaction.type === 'purchase';
              const amountClass = isPurchaseTransaction ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
              const bonusClass = amountClass;
              const typeVariant = isPurchaseTransaction ? 'success' : 'danger';
              const statusVariant = getStatusVariant(transaction.status);
              const bonusValue = parseFloat(transaction.bonus_amount || '0');
              const formattedBonus = bonusValue !== 0 ? formatCurrency(String(bonusValue)) : null;
              const userInitial = transaction.user_username?.charAt(0).toUpperCase() ?? '?';

              const handleOpenDetails = () => {
                handleViewTransaction(transaction);
              };

              return (
                <div
                  key={transaction.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden"
                >
                  {/* Top Section: User, Type & Status */}
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={handleOpenDetails}
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
                              onClick={handleOpenDetails}
                              className="text-left w-full touch-manipulation"
                              title="View transaction details"
                            >
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                {transaction.user_username ?? '—'}
                              </h3>
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {transaction.user_email ?? '—'}
                            </p>
                          </div>
                          <Badge variant={typeVariant} className="text-[10px] px-2 py-0.5 uppercase shrink-0">
                            {transaction.type ?? '—'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 capitalize">
                            {transaction.status}
                          </Badge>
                          <Badge variant="info" className="text-[10px] px-2 py-0.5 truncate flex-1 min-w-0">
                            {formatPaymentMethod(transaction.payment_method)}
                          </Badge>
                        </div>
                        {transaction.payment_details && typeof transaction.payment_details === 'object' && Object.keys(transaction.payment_details).length > 0 && (
                          <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-md p-2 space-y-1">
                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Details</div>
                            {Object.entries(transaction.payment_details).map(([key, value]) => (
                              <div key={key} className="text-[10px] text-gray-700 dark:text-gray-300">
                                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                                <span className="break-all">
                                  {typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Amount */}
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Amount</span>
                      <div className="text-right">
                        <div className={`text-base font-bold ${amountClass}`}>
                          {formatCurrency(transaction.amount || '0')}
                        </div>
                        {formattedBonus && (
                          <div className={`text-xs font-semibold mt-0.5 ${bonusClass}`}>
                            +{formattedBonus} bonus
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Balance Section */}
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

                  {/* Bottom Section: Date */}
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{transaction.created_at ? formatDate(transaction.created_at) : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
              </div>

              {transactionCount > transactionsPageSize && (
                <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                  <Pagination
                    currentPage={transactionsPage}
                    totalPages={Math.ceil(transactionCount / transactionsPageSize)}
                    hasNext={!!transactions?.next}
                    hasPrevious={!!transactions?.previous}
                    onPageChange={setTransactionsPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </DashboardSectionContainer>
      
      {/* View Transaction Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
          onComplete={selectedTransaction.status === 'pending' ? () => handleTransactionDetailsAction('completed') : undefined}
          onCancel={selectedTransaction.status === 'pending' ? () => handleTransactionDetailsAction('cancelled') : undefined}
          isActionLoading={pendingTransactionId === selectedTransaction.id}
        />
      )}

      {/* Confirmation Modal for Transaction Actions */}
      {isTransactionsView && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={handleCancelConfirm}
          onConfirm={handleConfirmAction}
          title={confirmTitle}
          description={confirmDescription}
          confirmText={confirmButtonText}
          cancelText="Go Back"
          variant={confirmVariant}
          isLoading={confirmModal.isLoading}
        />
      )}
      </>
    );
  }

  const isGameInitialLoading = queuesLoading;
  const gameResults = queues ?? [];
  const isGameEmpty = gameResults.length === 0 && !queuesLoading;
  const totalQueuePages = queuePageSize > 0 ? Math.max(1, Math.ceil(queueCount / queuePageSize)) : 1;
  const shouldShowQueuePagination = queueCount > queuePageSize || Boolean(queueNext) || Boolean(queuePrevious);
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
        loadingState={<ProcessingQueueTableSkeleton />}
        error={queuesError ?? ''}
        onRetry={fetchQueues}
        isEmpty={isGameEmpty}
        emptyState={gameEmptyState}
      >
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          {/* Compact Header */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
            <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
              {/* Icon */}
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
                <div className="h-4 w-4 sm:h-5 sm:w-5 text-white">
                  {metadata.icon}
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                {metadata.title}
              </h2>
              
              {/* Spacer */}
              <div className="flex-1 min-w-0" />
              
              {/* WebSocket Connection Status */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  {wsConnecting && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                      <span className="text-xs font-medium text-muted-foreground">Connecting...</span>
                    </>
                  )}
                  {wsConnected && !wsConnecting && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">Live Updates Active</span>
                    </>
                  )}
                  {isUsingFallback && !wsConnected && !wsConnecting && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">API Mode (Auto-refresh)</span>
                    </>
                  )}
                  {!wsConnected && !wsConnecting && !isUsingFallback && wsError && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">Offline</span>
                    </>
                  )}
                  {!wsConnected && !wsConnecting && !isUsingFallback && !wsError && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-xs font-medium text-muted-foreground">Disconnected</span>
                    </>
                  )}
                </div>
                {/* Refresh button - always visible, but highlighted in fallback mode */}
                <Button
                  variant={isUsingFallback ? "primary" : "ghost"}
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className={isUsingFallback ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                  title={isUsingFallback ? "Refresh data (WebSocket unavailable)" : "Refresh data"}
                >
                  <svg 
                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
          
          {metadata.hint && (
            <DashboardActionBar>
              <p className="text-sm text-muted-foreground">{metadata.hint}</p>
            </DashboardActionBar>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(!queues || queues.length === 0) ? (
              <div className="py-12">
                <EmptyState 
                  title="No Game Activities found" 
                  description="Try adjusting your filters or search criteria"
                />
              </div>
            ) : (
              <>
                <GameActivityTable
                  activities={queues}
                  onViewDetails={handleViewGameActivity}
                  showActions={true}
                  actionLoading={actionLoading}
                  className="border-0"
                />
                {shouldShowQueuePagination && (
                  <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                    <Pagination
                      currentPage={queuePage}
                      totalPages={totalQueuePages}
                      hasNext={Boolean(queueNext)}
                      hasPrevious={Boolean(queuePrevious)}
                      onPageChange={handleQueuePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DashboardSectionContainer>
      <ActionModal
        isOpen={isActionModalOpen}
        queue={selectedQueue}
        onSubmit={handleActionSubmit}
        onClose={() => {
          setIsActionModalOpen(false);
          setSelectedQueue(null);
        }}
      />
    </>
  );
}

