'use client';

import { memo, useCallback, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
} from '@/components/ui';
import type { Transaction } from '@/types';
import {
  formatCurrency,
  formatDate,
  getProviderDisplayName,
} from '@/lib/utils/formatters';
import {
  getTransactionAmountColorClass,
  getTransactionTypeBadgeStyle,
} from '@/lib/utils/transaction-display';

interface TransactionTableProps {
  transactions: Transaction[];
  onView: (transaction: Transaction) => void;
  showProvider?: boolean;
  mobileVariant?: 'default' | 'compact';
}

const mapStatusToVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  return 'default';
};

interface TransactionRowProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
  showProvider: boolean;
}

const TransactionRow = memo(function TransactionRow({ transaction, onView, showProvider }: TransactionRowProps) {
  const statusVariant = useMemo(() => mapStatusToVariant(transaction.status), [transaction.status]);
  const { variant: typeVariant, isTransfer } = useMemo(
    () => getTransactionTypeBadgeStyle(transaction.type, transaction.payment_method),
    [transaction.type, transaction.payment_method],
  );

  const formattedAmount = useMemo(() => formatCurrency(transaction.amount || '0'), [transaction.amount]);
  const amountColorClass = useMemo(
    () => getTransactionAmountColorClass(transaction.type, transaction.amount, transaction.status),
    [transaction.type, transaction.amount, transaction.status],
  );
  const bonusColorClass = amountColorClass;

  const bonusAmount = useMemo(() => {
    const bonus = parseFloat(transaction.bonus_amount || '0');
    return bonus > 0 ? bonus : null;
  }, [transaction.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

  const userInitial = useMemo(() => {
    return transaction.user_username?.charAt(0).toUpperCase() ?? '?';
  }, [transaction.user_username]);

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

  const creditChanged = useMemo(() => {
    return previousCreditBalance.value !== newCreditBalance.value;
  }, [previousCreditBalance.value, newCreditBalance.value]);

  const creditDisplayText = useMemo(() => {
    return `${previousCreditBalance.formatted} → ${newCreditBalance.formatted}`;
  }, [previousCreditBalance.formatted, newCreditBalance.formatted]);

  const creditColorClass = useMemo(() => {
    return creditChanged ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-gray-400';
  }, [creditChanged]);

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created_at), [transaction.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(transaction.updated_at), [transaction.updated_at]);

  const handleOpenDetails = useCallback(() => {
    onView(transaction);
  }, [transaction, onView]);

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell className="align-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenDetails}
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
              onClick={handleOpenDetails}
              className="text-left touch-manipulation"
              title="View transaction details"
            >
              <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {transaction.user_username ?? '—'}
              </div>
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400">{transaction.user_email ?? '—'}</div>
          </div>
        </div>
      </TableCell>

      <TableCell className="align-top">
        <div className="rounded-lg border border-gray-200/80 dark:border-gray-600/80 bg-gray-50/60 dark:bg-gray-800/40 px-2.5 py-2 w-fit">
          <Badge
            variant={typeVariant}
            className={`text-xs uppercase font-medium ${isTransfer ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/50' : ''}`}
          >
            {transaction.type}
          </Badge>
        </div>
      </TableCell>

      <TableCell className="align-top">
        <div className="min-w-[5rem] rounded-lg border border-gray-200/80 dark:border-gray-600/80 bg-gray-50/60 dark:bg-gray-800/40 px-2.5 py-2">
          <div className={`text-sm font-bold ${amountColorClass}`}>{formattedAmount}</div>
          {formattedBonus && (
            <div className={`text-xs font-semibold mt-0.5 ${bonusColorClass}`}>+{formattedBonus} bonus</div>
          )}
        </div>
      </TableCell>

      <TableCell className="align-top">
        <div className="min-w-[5.5rem] rounded-lg border border-gray-200/80 dark:border-gray-600/80 bg-gray-50/60 dark:bg-gray-800/40 px-2.5 py-2">
          <div className={`text-xs font-medium ${creditColorClass}`}>{creditDisplayText}</div>
        </div>
      </TableCell>

      <TableCell className="align-top">
        <div className="min-w-[5rem] rounded-lg border border-gray-200/80 dark:border-gray-600/80 bg-gray-50/60 dark:bg-gray-800/40 px-2.5 py-2">
          {transaction.payment_method?.trim() ? (
            <Badge variant="info" className="text-xs font-medium">
              {transaction.payment_method.trim()}
            </Badge>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
          )}
        </div>
      </TableCell>

      {showProvider && (
        <TableCell className="align-top">
          <div className="min-w-[5rem] rounded-lg border border-gray-200/80 dark:border-gray-600/80 bg-gray-50/60 dark:bg-gray-800/40 px-2.5 py-2">
            {transaction.provider ? (
              <Badge variant="info" className="text-xs font-medium">
                {getProviderDisplayName(transaction.provider, transaction.payment_method)}
              </Badge>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
            )}
          </div>
        </TableCell>
      )}

      <TableCell className="align-top">
        <div className="rounded-lg border border-gray-200/80 dark:border-gray-600/80 bg-gray-50/60 dark:bg-gray-800/40 px-2.5 py-2 w-fit">
          <Badge variant={statusVariant} className="capitalize font-medium">
            {transaction.status}
          </Badge>
        </div>
      </TableCell>

      <TableCell className="align-top">
        <div className="min-w-[6rem] rounded-lg border border-gray-200/80 dark:border-gray-600/80 bg-gray-50/60 dark:bg-gray-800/40 px-2.5 py-2">
          <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
            <div>{formattedCreatedAt}</div>
            <div>{formattedUpdatedAt}</div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
});

interface TransactionCardProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
  showProvider: boolean;
  mobileVariant: 'default' | 'compact';
}

const TransactionCard = memo(function TransactionCard({ transaction, onView, showProvider, mobileVariant }: TransactionCardProps) {
  const statusVariant = useMemo(() => mapStatusToVariant(transaction.status), [transaction.status]);
  const { variant: typeVariant, isTransfer } = useMemo(
    () => getTransactionTypeBadgeStyle(transaction.type, transaction.payment_method),
    [transaction.type, transaction.payment_method],
  );
  const formattedAmount = useMemo(() => formatCurrency(transaction.amount || '0'), [transaction.amount]);
  const amountColorClass = useMemo(
    () => getTransactionAmountColorClass(transaction.type, transaction.amount, transaction.status),
    [transaction.type, transaction.amount, transaction.status],
  );

  const bonusAmount = useMemo(() => {
    const bonus = parseFloat(transaction.bonus_amount || '0');
    return bonus > 0 ? bonus : null;
  }, [transaction.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

  const userInitial = useMemo(() => {
    return transaction.user_username?.charAt(0).toUpperCase() ?? '?';
  }, [transaction.user_username]);

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created_at), [transaction.created_at]);

  const handleOpenDetails = useCallback(() => {
    onView(transaction);
  }, [transaction, onView]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={handleOpenDetails}
            className="flex-shrink-0 touch-manipulation"
            title="View transaction details"
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-85">
              {userInitial}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={handleOpenDetails}
                  className="text-left w-full touch-manipulation"
                  title="View transaction details"
                >
                  <h3 className="truncate text-sm font-semibold leading-5 text-gray-900 transition-colors hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400">
                    {transaction.user_username ?? '—'}
                  </h3>
                </button>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                  {transaction.user_email ?? '—'}
                </p>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <Badge variant={statusVariant} className="h-5 px-2 text-[10px] capitalize">
                {transaction.status}
              </Badge>
              <Badge
                variant={typeVariant}
                className={`h-5 px-2 text-[10px] uppercase ${isTransfer ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/50' : ''}`}
              >
                {transaction.type}
              </Badge>
              {transaction.payment_method?.trim() ? (
                <Badge variant="info" className="h-5 px-2 text-[10px] truncate">
                  {transaction.payment_method.trim()}
                </Badge>
              ) : null}
              {showProvider && transaction.provider && (
                <Badge variant="info" className="h-5 px-2 text-[10px] truncate">
                  {getProviderDisplayName(transaction.provider, transaction.payment_method)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {mobileVariant === 'compact' ? (
        <>
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-gray-50/70 px-2 py-1.5 dark:bg-gray-800/60">
                <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Amount</div>
                <div className={`mt-0.5 text-sm font-semibold ${amountColorClass}`}>{formattedAmount}</div>
                {formattedBonus && (
                  <div className={`mt-0.5 text-[10px] font-medium ${amountColorClass}`}>+{formattedBonus} bonus</div>
                )}
              </div>
              <div className="rounded-md bg-gray-50/70 px-2 py-1.5 dark:bg-gray-800/60">
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
                    <>
                      <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Balance</div>
                      <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${creditColorClass}`}>
                        <span className="truncate">{formatCurrency(String(prevCredit))}</span>
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="font-semibold truncate">{formatCurrency(String(newCredit))}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Amount</span>
              <div className="text-right">
                <div className={`text-sm font-semibold ${amountColorClass}`}>{formattedAmount}</div>
                {formattedBonus && (
                  <div className={`mt-0.5 text-[11px] font-medium ${amountColorClass}`}>+{formattedBonus} bonus</div>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
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
                <div className="min-w-0">
                  <div className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Balance</div>
                  <div className={`flex items-center gap-1 text-[11px] ${creditColorClass}`}>
                    <span className="truncate">{formatCurrency(String(prevCredit))}</span>
                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="font-semibold truncate">{formatCurrency(String(newCredit))}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      <div className={`${mobileVariant === 'compact' ? 'px-3 py-2' : 'flex items-center justify-between px-3 py-2'}`}>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedCreatedAt}</span>
        </div>
        <button
          type="button"
          onClick={handleOpenDetails}
          className={`${mobileVariant === 'compact' ? 'mt-2 w-full' : ''} rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800`}
        >
          Details
        </button>
      </div>
    </div>
  );
});

export function TransactionTable({ transactions, onView, showProvider = true, mobileVariant = 'default' }: TransactionTableProps) {
  return (
    <>
      <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
        {transactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onView={onView}
            showProvider={showProvider}
            mobileVariant={mobileVariant}
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
              <TableHead>Balance</TableHead>
              <TableHead>Payment</TableHead>
              {showProvider && <TableHead>Provider</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onView={onView}
                showProvider={showProvider}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
