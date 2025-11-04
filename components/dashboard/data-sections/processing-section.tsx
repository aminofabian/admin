'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  EmptyState,
  TransactionDetailsModal
} from '@/components/features';
import { 
  useTransactionsStore, 
  useTransactionQueuesStore 
} from '@/stores';
import type { Transaction, TransactionQueue, GameActionType } from '@/types';
import { PROJECT_DOMAIN } from '@/lib/constants/api';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { transactionsApi } from '@/lib/api/transactions';
import type { ApiError } from '@/types';
import { useToast } from '@/components/ui';

type ViewType = 'purchases' | 'cashouts' | 'game_activities';
type QueueFilterType = 'processing' | 'history' | 'recharge_game' | 'redeem_game' | 'add_user_game' | 'create_game';

interface ProcessingSectionProps {
  type: ViewType;
}

// Skeleton loaders for better UX
function ProcessingTransactionTableSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96" />
      </div>
      
      {/* Hint bar skeleton */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      
      {/* Table skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {[...Array(11)].map((_, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination skeleton */}
      <div className="flex justify-center gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-10 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ProcessingQueueTableSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-black/20 overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {[...Array(10)].map((_, i) => (
                <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProcessingStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      ))}
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
  onView: () => void;
  onComplete: () => Promise<void>;
  onCancel: () => Promise<void>;
  isActionPending: boolean;
  viewType?: 'purchases' | 'cashouts';
}

function ProcessingTransactionRow({ transaction, getStatusVariant, onView, onComplete, onCancel, isActionPending, viewType }: ProcessingTransactionRowProps) {
  const bonusValue = parseFloat(transaction.bonus_amount || '0');
  const paymentMethod = transaction.payment_method ?? '—';
  const lowerPaymentMethod = paymentMethod.toLowerCase();
  const isCryptoPayment = CRYPTO_PAYMENT_METHODS.some((method) => lowerPaymentMethod.includes(method));
  const explicitInvoiceUrl = transaction.payment_url ?? transaction.invoice_url;
  const sanitizedInvoiceUrl = typeof explicitInvoiceUrl === 'string' ? explicitInvoiceUrl.trim() : '';
  const invoiceUrl = sanitizedInvoiceUrl.length > 0
    ? sanitizedInvoiceUrl
    : transaction.id
      ? `${(process.env.NEXT_PUBLIC_API_URL ?? PROJECT_DOMAIN).replace(/\/$/, '')}/api/v1/transactions/${transaction.id}/invoice/`
      : undefined;
  const isPending = transaction.status === 'pending';
  const disableActions = isActionPending || !isPending;

  const isPurchase = transaction.type === 'purchase';
  const statusVariant = getStatusVariant(transaction.status);

  const userCell = (
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
          {transaction.user_username?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{transaction.user_username ?? '—'}</div>
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

  const amountCell = (
    <TableCell>
      <div className="text-sm font-bold text-green-600 dark:text-green-400">
        {formattedAmount}
      </div>
      {formattedBonus && (
        <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">
          +{formattedBonus} bonus
        </div>
      )}
    </TableCell>
  );

  const prevBalanceCell = (
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
  );

  const newBalanceCell = (
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
      <Badge variant="info" className="text-xs">
        {paymentMethod}
      </Badge>
    </TableCell>
  );

  const datesCell = (
    <TableCell>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>{transaction.created ? formatDate(transaction.created) : '—'}</div>
        <div>{transaction.updated ? formatDate(transaction.updated) : '—'}</div>
      </div>
    </TableCell>
  );

  return (
    <TableRow>
      {userCell}
      {transactionCell}
      {amountCell}
      {prevBalanceCell}
      {newBalanceCell}
      {statusCell}
      {paymentCell}
      {datesCell}
      <TableCell className="text-right">
        <div className="inline-flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onView();
            }}
            disabled={isActionPending}
          >
            View
          </Button>
          {isPending && (
            <>
              <Button
                variant="primary"
                size="sm"
                className="font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔵 Complete button clicked');
                  void onComplete();
                }}
                disabled={disableActions}
              >
                Complete
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔴 Cancel button clicked');
                  void onCancel();
                }}
                disabled={disableActions}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

const mapTypeToLabel = (type: string): string => {
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game' || type === 'create_game') return 'Add User';
  return type;
};

const mapTypeToVariant = (type: string): 'success' | 'danger' | 'info' | 'default' => {
  if (type === 'recharge_game') return 'success';
  if (type === 'redeem_game') return 'danger';
  return 'info';
};

const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status.toLowerCase()) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'failed': case 'cancelled': return 'danger';
    default: return 'info';
  }
};

interface ProcessingGameActivityRowProps {
  queue: TransactionQueue;
  actionLoading: boolean;
  onQuickAction: (queue: TransactionQueue, action: string) => void;
}

function ProcessingGameActivityRow({ queue, actionLoading, onQuickAction }: ProcessingGameActivityRowProps) {
  const statusVariant = getStatusVariant(queue.status);
  const typeLabel = mapTypeToLabel(queue.type);
  const typeVariant = mapTypeToVariant(queue.type);
  const formattedAmount = formatCurrency(queue.amount || '0');
  
  const bonusAmount = useMemo(() => {
    const bonus = queue.bonus_amount || queue.data?.bonus_amount;
    if (!bonus) return null;
    const bonusValue = typeof bonus === 'string' || typeof bonus === 'number' 
      ? parseFloat(String(bonus)) 
      : 0;
    return bonusValue > 0 ? bonus : null;
  }, [queue.bonus_amount, queue.data?.bonus_amount]);

  const formattedBonus = bonusAmount ? formatCurrency(String(bonusAmount)) : null;

  // New balance from data object
  const newCreditsBalance = useMemo(() => {
    const credits = queue.data?.new_credits_balance;
    if (credits === undefined || credits === null) return null;
    const creditsValue = typeof credits === 'string' || typeof credits === 'number'
      ? parseFloat(String(credits))
      : null;
    return creditsValue !== null && !isNaN(creditsValue) ? formatCurrency(String(creditsValue)) : null;
  }, [queue.data?.new_credits_balance]);

  const newWinningBalance = useMemo(() => {
    const winnings = queue.data?.new_winning_balance;
    if (winnings === undefined || winnings === null) return null;
    const winningsValue = typeof winnings === 'string' || typeof winnings === 'number'
      ? parseFloat(String(winnings))
      : null;
    return winningsValue !== null && !isNaN(winningsValue) ? formatCurrency(String(winningsValue)) : null;
  }, [queue.data?.new_winning_balance]);

  // Website user (actual user on the platform)
  const websiteUsername = typeof queue.user_username === 'string' && queue.user_username.trim()
    ? queue.user_username.trim()
    : null;

  const websiteEmail = typeof queue.user_email === 'string' && queue.user_email.trim()
    ? queue.user_email.trim()
    : null;

  // Game username (username used in the game)
  const gameUsername = (() => {
    // 1. Top-level game_username field
    if (typeof queue.game_username === 'string' && queue.game_username.trim()) {
      return queue.game_username.trim();
    }
    // 2. Username in data object (for completed transactions)
    if (queue.data && typeof queue.data === 'object' && queue.data !== null) {
      const dataUsername = queue.data.username;
      if (typeof dataUsername === 'string' && dataUsername.trim()) {
        return dataUsername.trim();
      }
    }
    return null;
  })();

  const userInitial = websiteUsername
    ? websiteUsername.charAt(0).toUpperCase()
    : queue.user_id
      ? String(queue.user_id).charAt(0)
      : '—';

  const formattedCreatedAt = formatDate(queue.created_at);
  const formattedUpdatedAt = formatDate(queue.updated_at);
  const showUpdatedAt = queue.updated_at !== queue.created_at;

  const handleActionClick = useCallback(() => {
    onQuickAction(queue, 'view');
  }, [queue, onQuickAction]);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {userInitial}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {websiteUsername || `User ${queue.user_id}`}
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
        <Badge variant={typeVariant} className="capitalize">
          {typeLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="font-medium">{queue.game}</div>
      </TableCell>
      <TableCell>
        {gameUsername ? (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {gameUsername}
          </div>
        ) : queue.status === 'cancelled' ? (
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
        <div className="text-sm font-bold text-green-600 dark:text-green-400">
          {formattedAmount}
          {formattedBonus && (
            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">
              +{formattedBonus} bonus
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        {(newCreditsBalance || newWinningBalance) ? (
          <div className="space-y-1">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              C: {newCreditsBalance || formatCurrency('0')}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              W: {newWinningBalance || formatCurrency('0')}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">—</div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {queue.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{formattedCreatedAt}</div>
          {showUpdatedAt && (
            <div>{formattedUpdatedAt}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="primary"
          disabled={actionLoading}
          onClick={handleActionClick}
        >
          View Details
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface MobileTransactionActionsProps {
  transaction: Transaction;
  isPending: boolean;
  onView: () => void;
  onComplete: () => Promise<void>;
  onCancel: () => Promise<void>;
}

function MobileTransactionActions({
  transaction,
  isPending,
  onView,
  onComplete,
  onCancel,
}: MobileTransactionActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative pt-2 border-t border-border" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span>Actions</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          <button
            onClick={() => {
              onView();
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-accent transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>

          {transaction.status === 'pending' && (
            <>
              <div className="h-px bg-border" />
              <button
                onClick={async () => {
                  await onComplete();
                  setIsOpen(false);
                }}
                disabled={isPending}
                className="w-full px-4 py-3 text-left text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Complete Transaction
              </button>

              <div className="h-px bg-border" />
              <button
                onClick={async () => {
                  await onCancel();
                  setIsOpen(false);
                }}
                disabled={isPending}
                className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Transaction
              </button>
            </>
          )}
        </div>
      )}
    </div>
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
  const [queueFilter] = useState<QueueFilterType>('processing');
  const [selectedQueue, setSelectedQueue] = useState<TransactionQueue | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { addToast } = useToast();

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
      console.log('✅ Transaction Action - API call successful:', response);
      
      // Refresh transactions after successful action
      await fetchTransactions();
      
      // Show success toast
      addToast({
        type: 'success',
        title: `Transaction ${action === 'completed' ? 'Completed' : 'Cancelled'}`,
        description: `Transaction ${action} successfully`,
        duration: 3000,
      });
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

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleQuickAction = async (queue: TransactionQueue, action: string) => {
    if (action === 'view') {
      // Open modal to view details and select action
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
  };

  const renderQueues = () => {
    // Defensive programming: ensure queues is actually an array
    if (!queues || !Array.isArray(queues) || queues.length === 0) {
      return null;
    }

    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
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
              {queues.map((queue: TransactionQueue) => (
                <ProcessingGameActivityRow
                  key={queue.id}
                  queue={queue}
                  actionLoading={actionLoading}
                  onQuickAction={handleQuickAction}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (isTransactionsView) {
    const isInitialLoading = transactionsLoading && !transactions;
    const isEmpty = transactionResults.length === 0;
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
        <DashboardSectionHeader
          title={metadata.title}
          description={metadata.description}
          icon={metadata.icon}
        />
        {metadata.hint && (
          <DashboardActionBar>
            <p className="text-sm text-muted-foreground">
              {metadata.hint}
            </p>
          </DashboardActionBar>
        )}
        {/* Desktop Table View */}
        {transactionResults.length > 0 && (
          <div className="hidden lg:block overflow-hidden rounded-lg border border-border bg-card">
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
                {transactionResults.map((transaction) => (
                  <ProcessingTransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    getStatusVariant={getStatusVariant}
                    viewType={viewType}
                    onView={() => handleViewTransaction(transaction)}
                    onComplete={async () => {
                      try {
                        await handleTransactionAction(
                          transaction.id, 
                          'completed',
                          transaction.id,
                          transaction.status
                        );
                      } catch (error) {
                        // Error is already handled in handleTransactionAction
                        // This catch prevents uncaught promise rejection
                        console.error('Error in onComplete handler:', error);
                      }
                    }}
                    onCancel={async () => {
                      try {
                        await handleTransactionAction(
                          transaction.id, 
                          'cancelled',
                          transaction.id,
                          transaction.status
                        );
                      } catch (error) {
                        // Error is already handled in handleTransactionAction
                        // This catch prevents uncaught promise rejection
                        console.error('Error in onCancel handler:', error);
                      }
                    }}
                    isActionPending={pendingTransactionId === transaction.id}
                  />
                ))}
              </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        {transactionResults.length > 0 && (
          <div className="lg:hidden space-y-4">
            {transactionResults.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-card rounded-lg border border-border p-4 space-y-3"
              >
                {/* User Info */}
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                    {transaction.user_username?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{transaction.user_username ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{transaction.user_email ?? '—'}</div>
                  </div>
                  <Badge variant={transaction.type === 'purchase' ? 'success' : 'danger'} className="text-xs">
                    {transaction.type?.toUpperCase() ?? '—'}
                  </Badge>
                </div>

                {/* Amount and Balance */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Amount</div>
                    <div className="text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(transaction.amount || '0')}
                    </div>
                    {transaction.bonus_amount && parseFloat(transaction.bonus_amount) > 0 && (
                      <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">
                        +{formatCurrency(transaction.bonus_amount)} bonus
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <Badge variant={getStatusVariant(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Previous Balance</div>
                    <div className="space-y-0.5">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        C: {formatCurrency(transaction.previous_balance || '0')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        W: {transaction.previous_winning_balance && !isNaN(parseFloat(transaction.previous_winning_balance))
                          ? formatCurrency(transaction.previous_winning_balance)
                          : formatCurrency('0')}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">New Balance</div>
                    <div className="space-y-0.5">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        C: {formatCurrency(transaction.new_balance || '0')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        W: {transaction.new_winning_balance && !isNaN(parseFloat(transaction.new_winning_balance))
                          ? formatCurrency(transaction.new_winning_balance)
                          : formatCurrency('0')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground mb-1">Payment Method</div>
                  <div className="font-medium">{transaction.payment_method ?? '—'}</div>
                </div>

                {/* Date */}
                <div className="text-xs text-muted-foreground">
                  {formatDate(transaction.created)}
                </div>

                {/* Actions */}
                <MobileTransactionActions
                  transaction={transaction}
                  isPending={pendingTransactionId === transaction.id}
                  onView={() => handleViewTransaction(transaction)}
                  onComplete={async () => {
                    try {
                      await handleTransactionAction(
                        transaction.id,
                        'completed',
                        transaction.id,
                        transaction.status
                      );
                    } catch (error) {
                      console.error('Error in onComplete handler:', error);
                    }
                  }}
                  onCancel={async () => {
                    try {
                      await handleTransactionAction(
                        transaction.id,
                        'cancelled',
                        transaction.id,
                        transaction.status
                      );
                    } catch (error) {
                      console.error('Error in onCancel handler:', error);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {transactionCount > transactionsPageSize && (
          <div className="border-t border-border px-4 py-4">
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
      
      {/* View Transaction Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
        />
      )}
      </>
    );
  }

  const isGameInitialLoading = queuesLoading && !queues;
  const gameResults = queues ?? [];
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
        loadingState={<ProcessingQueueTableSkeleton />}
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
        {metadata.hint && (
          <DashboardActionBar>
            <p className="text-sm text-muted-foreground">{metadata.hint}</p>
          </DashboardActionBar>
        )}
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

