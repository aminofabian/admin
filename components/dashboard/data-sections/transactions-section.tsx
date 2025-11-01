'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import {
  DashboardActionBar,
  DashboardSearchBar,
  DashboardSectionContainer,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardStatGrid,
} from '@/components/dashboard/layout';
import { Badge, Button, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useSearch } from '@/lib/hooks';
import { useTransactionsStore } from '@/stores';
import type { Transaction } from '@/types';
import { PROJECT_DOMAIN } from '@/lib/constants/api';
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

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'processing', label: 'Processing' },
  { value: 'history', label: 'History' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'cashouts', label: 'Cashouts' },
] as const;

const PENDING_FILTER_OPTIONS = [
  { value: 'pending-purchases', label: 'Pending Purchases' },
  { value: 'pending-cashouts', label: 'Pending Cashouts' },
] as const;

const DEFAULT_HISTORY_FILTERS: HistoryTransactionsFiltersState = {
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
  const {
    transactions,
    isLoading,
    error,
    currentPage,
    pageSize,
    searchTerm,
    filter,
    setPage,
    setSearchTerm,
    setFilter,
    fetchTransactions,
    advancedFilters,
    setAdvancedFilters,
    clearAdvancedFilters,
  } = useTransactionsStore();

  const { search, debouncedSearch, setSearch } = useSearch(searchTerm);
  const [filters, setFilters] = useState<HistoryTransactionsFiltersState>(() => buildHistoryFilterState(advancedFilters));
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (debouncedSearch !== undefined && debouncedSearch !== searchTerm) {
      setSearchTerm(debouncedSearch);
    }
  }, [debouncedSearch, searchTerm, setSearchTerm]);

  useEffect(() => {
    setFilters(buildHistoryFilterState(advancedFilters));

    if (Object.keys(advancedFilters).length > 0) {
      setAreFiltersOpen(true);
    }
  }, [advancedFilters]);

  const handleAdvancedFilterChange = (key: keyof HistoryTransactionsFiltersState, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const handleApplyAdvancedFilters = () => {
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

    setAdvancedFilters(sanitized);
  };

  const handleClearAdvancedFilters = () => {
    setFilters({ ...DEFAULT_HISTORY_FILTERS });
    clearAdvancedFilters();
  };

  const handleToggleAdvancedFilters = () => {
    setAreFiltersOpen((previous) => !previous);
  };

  const rawResults = transactions?.results;
  const results = useMemo<Transaction[]>(() => rawResults ?? [], [rawResults]);
  const totalCount = transactions?.count ?? 0;
  const stats = useMemo(() => buildTransactionStats(results, totalCount), [results, totalCount]);

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
      <TransactionsLayout
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        advancedFilters={filters}
        onAdvancedFilterChange={handleAdvancedFilterChange}
        onApplyAdvancedFilters={handleApplyAdvancedFilters}
        onClearAdvancedFilters={handleClearAdvancedFilters}
        areAdvancedFiltersOpen={areFiltersOpen}
        onToggleAdvancedFilters={handleToggleAdvancedFilters}
        stats={stats}
        transactions={results}
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </DashboardSectionContainer>
  );
}

interface TransactionsLayoutProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: typeof FILTER_OPTIONS[number]['value'] | typeof PENDING_FILTER_OPTIONS[number]['value']) => void;
  advancedFilters: HistoryTransactionsFiltersState;
  onAdvancedFilterChange: (key: keyof HistoryTransactionsFiltersState, value: string) => void;
  onApplyAdvancedFilters: () => void;
  onClearAdvancedFilters: () => void;
  areAdvancedFiltersOpen: boolean;
  onToggleAdvancedFilters: () => void;
  stats: TransactionStat[];
  transactions: Transaction[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function TransactionsLayout({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  advancedFilters,
  onAdvancedFilterChange,
  onApplyAdvancedFilters,
  onClearAdvancedFilters,
  areAdvancedFiltersOpen,
  onToggleAdvancedFilters,
  stats,
  transactions,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: TransactionsLayoutProps) {
  return (
    <>
      <DashboardSectionHeader
        title="Transactions"
        description="Comprehensive transaction management and analytics"
        icon={HEADER_ICON}
        badge={
          filter !== 'all' ? (
            <Badge variant="info" className="uppercase tracking-wide">
              {formatFilterLabel(filter)}
            </Badge>
          ) : undefined
        }
      />

      <DashboardActionBar>
        <DashboardSearchBar
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by username, email, transaction ID, or description"
        />
        <TransactionsFilters
          filter={filter}
          onFilterChange={onFilterChange}
        />
      </DashboardActionBar>
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
      />

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

interface TransactionsFiltersProps {
  filter: string;
  onFilterChange: (value: typeof FILTER_OPTIONS[number]['value'] | typeof PENDING_FILTER_OPTIONS[number]['value']) => void;
}

function TransactionsFilters({ filter, onFilterChange }: TransactionsFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            active={filter === option.value}
            onClick={() => onFilterChange(option.value)}
            label={option.label}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pending only
        </span>
        {PENDING_FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            active={filter === option.value}
            onClick={() => onFilterChange(option.value)}
            label={option.label}
          />
        ))}
      </div>
    </div>
  );
}

interface FilterChipProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function FilterChip({ active, label, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {label}
    </button>
  );
}

type TransactionStat = {
  title: string;
  value: string;
  helper?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon: JSX.Element;
};

function buildTransactionStats(transactions: Transaction[], total: number): TransactionStat[] {
  const completed = transactions.filter((tx) => tx.status === 'completed').length;
  const pending = transactions.filter((tx) => tx.status === 'pending').length;
  const failed = transactions.filter((tx) => tx.status === 'failed' || tx.status === 'cancelled').length;
  const volume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

  return [
    {
      title: 'Total Transactions',
      value: total.toLocaleString(),
      helper: `Page volume ${formatCurrency(volume.toString())}`,
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
      title: 'Pending',
      value: pending.toLocaleString(),
      helper: 'Awaiting processing',
      variant: 'warning',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
        </svg>
      ),
    },
    {
      title: 'Failed / Cancelled',
      value: failed.toLocaleString(),
      helper: `${total ? Math.round((failed / total) * 100) : 0}% of total volume`,
      variant: 'danger',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  ];
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
  if (!transactions.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tx ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Previous Balance</TableHead>
              <TableHead>New Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TransactionsRow key={transaction.id} transaction={transaction} />
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

interface TransactionsRowProps {
  transaction: Transaction;
}

function TransactionsRow({ transaction }: TransactionsRowProps) {
  const bonus = parseFloat(transaction.bonus_amount || '0');
  const statusVariant = mapStatusToVariant(transaction.status);
  const paymentMethod = transaction.payment_method?.toLowerCase() ?? '';
  const isCryptoPayment = paymentMethod.includes('crypto');
  const invoiceUrl = transaction.invoice_url
    ? transaction.invoice_url
    : `${(process.env.NEXT_PUBLIC_API_URL ?? PROJECT_DOMAIN).replace(/\/$/, '')}/api/v1/transactions/${transaction.id}/invoice/`;
  const canViewInvoice = isCryptoPayment && !!invoiceUrl;

  return (
    <TableRow>
      <TableCell>
        <code className="text-xs text-muted-foreground">{transaction.unique_id}</code>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium text-foreground">{transaction.user_username}</div>
          <div className="text-xs text-muted-foreground">{transaction.user_email}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium text-foreground">{transaction.description}</div>
          <Badge variant={transaction.type === 'purchase' ? 'success' : 'warning'} className="text-xs">
            {transaction.type.toUpperCase()}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-semibold text-foreground">{formatCurrency(transaction.amount)}</div>
        {bonus > 0 && (
          <div className="text-xs text-muted-foreground">+{formatCurrency(transaction.bonus_amount)} bonus</div>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">{formatCurrency(transaction.previous_balance)}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-semibold text-foreground">{formatCurrency(transaction.new_balance)}</div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {transaction.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <Badge variant="info" className="text-xs">
            {transaction.payment_method}
          </Badge>
          <div className="text-xs text-muted-foreground">{transaction.currency}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="font-medium text-foreground">Created:</span> {transaction.created ? formatDate(transaction.created) : '—'}
          </div>
          <div>
            <span className="font-medium text-foreground">Updated:</span> {transaction.updated ? formatDate(transaction.updated) : '—'}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-foreground">
          {transaction.operator}
          <div className="text-xs text-muted-foreground">{transaction.role}</div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {canViewInvoice ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(invoiceUrl, '_blank', 'noopener,noreferrer')}
          >
            View Invoice
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function mapStatusToVariant(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  return 'default';
}

function formatFilterLabel(filter: string): string {
  return filter
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

