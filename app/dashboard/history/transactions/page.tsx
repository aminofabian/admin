'use client';

import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { DashboardSectionContainer } from '@/components/dashboard/layout/dashboard-section-container';
import { DashboardSectionHeader } from '@/components/dashboard/layout/dashboard-section-header';
import { DashboardSearchBar } from '@/components/dashboard/layout/dashboard-search-bar';
import { DashboardActionBar } from '@/components/dashboard/layout/dashboard-action-bar';
import { DashboardStatGrid } from '@/components/dashboard/layout/dashboard-stat-grid';
import { DashboardStatCard } from '@/components/dashboard/layout/dashboard-stat-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Pagination } from '@/components/ui';
import { EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useSearch } from '@/lib/hooks';
import { useTransactionsStore } from '@/stores';
import type { Transaction } from '@/types';

const HISTORY_ICON = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EMPTY_STATE = (
  <EmptyState
    title="No transaction history"
    description="No completed or cancelled transactions matched your filters"
  />
);

export default function HistoryTransactionsPage() {
  const {
    transactions,
    isLoading,
    error,
    currentPage,
    setPage,
    setSearchTerm,
    setFilter,
    fetchTransactions,
  } = useTransactionsStore();

  const { search, debouncedSearch, setSearch } = useSearch();

  useEffect(() => {
    setFilter('history');
  }, [setFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      setSearchTerm(debouncedSearch);
    }
  }, [debouncedSearch, setSearchTerm]);

  const results = transactions?.results ?? [];

  const stats = useMemo(() => buildHistoryStats(results, transactions?.count ?? 0), [results, transactions?.count]);

  const isInitialLoading = isLoading && !transactions;
  const isEmpty = !results.length;

  return (
    <DashboardSectionContainer
      isLoading={isInitialLoading}
      error={error ?? ''}
      onRetry={fetchTransactions}
      isEmpty={isEmpty}
      emptyState={EMPTY_STATE}
    >
      <HistoryTransactionsLayout
        search={search}
        onSearchChange={setSearch}
        stats={stats}
        transactions={results}
        currentPage={currentPage}
        totalCount={transactions?.count ?? 0}
        onPageChange={setPage}
        pageSize={10}
      />
    </DashboardSectionContainer>
  );
}

interface HistoryTransactionsLayoutProps {
  search: string;
  onSearchChange: (value: string) => void;
  stats: HistoryStat[];
  transactions: Transaction[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function HistoryTransactionsLayout({
  search,
  onSearchChange,
  stats,
  transactions,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: HistoryTransactionsLayoutProps) {
  return (
    <>
      <DashboardSectionHeader
        title="Transaction History"
        description="Comprehensive transaction management and analytics"
        icon={HISTORY_ICON}
      />
      <DashboardActionBar>
        <DashboardSearchBar
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by username, email, transaction ID, or description"
        />
      </DashboardActionBar>
      <HistoryTransactionsStats stats={stats} />
      <HistoryTransactionsTable
        transactions={transactions}
        currentPage={currentPage}
        totalCount={totalCount}
        onPageChange={onPageChange}
        pageSize={pageSize}
      />
    </>
  );
}

interface HistoryStat {
  title: string;
  value: string;
  helper?: string;
  variant?: 'default' | 'success' | 'danger' | 'info';
  icon: JSX.Element;
}

function buildHistoryStats(transactions: Transaction[], total: number): HistoryStat[] {
  const completed = transactions.filter((tx) => tx.status === 'completed').length;
  const cancelled = transactions.filter((tx) => tx.status === 'cancelled').length;
  const amount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

  return [
    {
      title: 'Total Transactions',
      value: total.toLocaleString(),
      helper: 'History records only',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-6 4h6m-6 4h6m-9 4h12" />
        </svg>
      ),
    },
    {
      title: 'Completed',
      value: completed.toLocaleString(),
      helper: `${total ? Math.round((completed / total) * 100) : 0}% success rate`,
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
      helper: `${total ? Math.round((cancelled / total) * 100) : 0}% of total volume`,
      variant: 'danger',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    {
      title: 'Total Value',
      value: formatCurrency(amount.toString()),
      helper: 'Includes bonuses',
      variant: 'info',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];
}

interface HistoryTransactionsStatsProps {
  stats: HistoryStat[];
}

function HistoryTransactionsStats({ stats }: HistoryTransactionsStatsProps) {
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

interface HistoryTransactionsTableProps {
  transactions: Transaction[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function HistoryTransactionsTable({
  transactions,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: HistoryTransactionsTableProps) {
  if (!transactions.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <HistoryTransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </TableBody>
        </Table>
      </div>
      {totalCount > pageSize && (
        <div className="border-t border-border px-4 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / pageSize)}
            onPageChange={onPageChange}
            hasNext={currentPage * pageSize < totalCount}
            hasPrevious={currentPage > 1}
          />
        </div>
      )}
    </div>
  );
}

interface HistoryTransactionRowProps {
  transaction: Transaction;
}

function HistoryTransactionRow({ transaction }: HistoryTransactionRowProps) {
  const badgeVariant = transaction.status === 'completed' ? 'success' : 'default';
  const bonusValue = parseFloat(transaction.bonus_amount || '0');

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-semibold text-primary">
              {transaction.user_username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium">{transaction.user_username}</div>
            <div className="text-xs text-muted-foreground">{transaction.user_email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{transaction.description}</div>
          <div className="flex items-center gap-2">
            <Badge variant={transaction.type === 'purchase' ? 'success' : 'warning'} className="text-xs">
              {transaction.type.toUpperCase()}
            </Badge>
            <code className="text-xs text-muted-foreground">{transaction.unique_id}</code>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-semibold">{formatCurrency(transaction.amount)}</div>
        {bonusValue > 0 && (
          <div className="text-xs text-muted-foreground">+{formatCurrency(transaction.bonus_amount)} bonus</div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={badgeVariant as 'success' | 'default'} className="capitalize">
          {transaction.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="info">{transaction.payment_method}</Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">{transaction.created ? formatDate(transaction.created) : 'N/A'}</div>
      </TableCell>
    </TableRow>
  );
}
