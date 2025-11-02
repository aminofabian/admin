'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  DashboardActionBar,
  DashboardSearchBar,
  DashboardSectionContainer,
  DashboardSectionHeader,
} from '@/components/dashboard/layout';
import { Badge, Button, Modal, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useSearch } from '@/lib/hooks';
import { useTransactionsStore } from '@/stores';
import type { Transaction } from '@/types';
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

  const rawResults = transactions?.results ?? [];
  
  // Filter to only show transactions with operator "bot" or "admin" (company maps to admin)
  // Exclude transactions where operator is "player" or other values
  const results = useMemo<Transaction[]>(() => {
    return rawResults.filter((transaction) => {
      const operator = transaction.operator?.toLowerCase() ?? '';
      // Only show if operator is bot, admin, or company (company will be displayed as admin)
      return operator === 'bot' || operator === 'admin' || operator === 'company';
    });
  }, [rawResults]);
  
  const totalCount = results.length;

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
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  if (!transactions.length) {
    return null;
  }

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsViewModalOpen(false);
    setSelectedTransaction(null);
  };

  // Reset visible cards when page or transactions change
  useEffect(() => {
    setVisibleCards(new Set());
  }, [currentPage, transactions.length]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -10% 0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Find the index by checking which element matches
        for (const [index, element] of cardRefs.current.entries()) {
          if (element === entry.target && entry.isIntersecting) {
            setVisibleCards((prev) => {
              const newSet = new Set(prev);
              newSet.add(index);
              return newSet;
            });
            break;
          }
        }
      });
    }, observerOptions);

    // Small delay to ensure refs are set, then observe
    const timeoutId = setTimeout(() => {
      cardRefs.current.forEach((element, index) => {
        if (element) {
          // Check if element is already in viewport
          const rect = element.getBoundingClientRect();
          const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
          
          if (isInViewport) {
            setVisibleCards((prev) => {
              const newSet = new Set(prev);
              newSet.add(index);
              return newSet;
            });
          }
          
          observer.observe(element);
        }
      });
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [transactions.length, currentPage]);

  return (
    <>
      {/* Desktop Table View */}
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
              <TableHead>Operator</TableHead>
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
              totalPages={Math.ceil(totalCount / pageSize)}
              onPageChange={onPageChange}
              hasNext={currentPage * pageSize < totalCount}
              hasPrevious={currentPage > 1}
            />
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden relative pl-12">
        {transactions.map((transaction, index) => {
          const cardNumber = (currentPage - 1) * pageSize + index + 1;
          const isVisible = visibleCards.has(index);
          const isLast = index === transactions.length - 1;
          const isFirst = index === 0;
          
          return (
            <div 
              key={transaction.id}
              className="relative mb-6 last:mb-0"
              ref={(el) => {
                if (el) {
                  cardRefs.current.set(index, el);
                } else {
                  cardRefs.current.delete(index);
                }
              }}
            >
              <TransactionCard 
                transaction={transaction}
                onView={handleViewTransaction}
                cardNumber={cardNumber}
                isVisible={isVisible}
                animationDelay={index * 50}
                isLast={isLast}
                isFirst={isFirst}
              />
            </div>
          );
        })}
        {totalCount > pageSize && (
          <div className="pt-4 mt-4 pb-[100px] md:pb-4 border-t border-border">
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

      <Modal
        isOpen={isViewModalOpen}
        onClose={handleCloseModal}
        title="Transaction Details"
        size="lg"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            {/* Header Section - Status and Type */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <Badge variant={selectedTransaction.type === 'purchase' ? 'success' : 'warning'} className="text-sm px-3 py-1">
                  {selectedTransaction.type.toUpperCase()}
                </Badge>
                <Badge variant={mapStatusToVariant(selectedTransaction.status)} className="text-sm px-3 py-1">
                  {selectedTransaction.status}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{formatCurrency(selectedTransaction.amount)}</div>
                {parseFloat(selectedTransaction.bonus_amount || '0') > 0 && (
                  <div className="text-sm font-semibold text-green-600">
                    +{formatCurrency(selectedTransaction.bonus_amount)} bonus
                  </div>
                )}
              </div>
            </div>

            {/* Transaction IDs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transaction ID</label>
                <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
                  {selectedTransaction.id}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unique ID</label>
                <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
                  {selectedTransaction.unique_id}
                </div>
              </div>
            </div>

            {/* Balance Section */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Previous Balance</label>
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{formatCurrency(selectedTransaction.previous_balance)}</div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">New Balance</label>
                <div className="text-lg font-bold text-green-900 dark:text-green-100">{formatCurrency(selectedTransaction.new_balance)}</div>
              </div>
            </div>

            {/* User Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">User Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Username</label>
                  <div className="text-sm font-semibold text-foreground">{selectedTransaction.user_username}</div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Email</label>
                  <div className="text-sm text-foreground">{selectedTransaction.user_email}</div>
                </div>
              </div>
            </div>

            {/* Payment & Operator Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Payment & Operator</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Payment Method</label>
                  <Badge variant="info" className="text-xs">
                    {selectedTransaction.payment_method}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Currency</label>
                  <div className="text-sm text-foreground">{selectedTransaction.currency}</div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Operator</label>
                  <div className="text-sm font-semibold text-foreground">
                    {selectedTransaction.operator?.toLowerCase() === 'company' ? 'admin' : selectedTransaction.operator}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Role</label>
                  <div className="text-sm text-foreground">{selectedTransaction.role}</div>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Transaction Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Journal Entry</label>
                  <Badge variant="info" className="text-xs">
                    {selectedTransaction.journal_entry}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Action</label>
                  <div className="text-sm text-foreground">{selectedTransaction.action}</div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">Description</label>
                <div className="text-sm text-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/30">
                  {selectedTransaction.description}
                </div>
              </div>
              {selectedTransaction.remarks && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Remarks</label>
                  <div className="text-sm text-foreground bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                    {selectedTransaction.remarks}
                  </div>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Timestamps</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Created</label>
                  <div className="text-sm font-medium text-foreground">{formatDate(selectedTransaction.created)}</div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Updated</label>
                  <div className="text-sm font-medium text-foreground">{formatDate(selectedTransaction.updated)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

interface TransactionsRowProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
}

function TransactionsRow({ transaction, onView }: TransactionsRowProps) {
  const bonus = parseFloat(transaction.bonus_amount || '0');
  const isPurchase = transaction.type === 'purchase';
  const statusVariant = mapStatusToVariant(transaction.status);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {transaction.user_username.charAt(0).toUpperCase()}
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
        <Badge variant={isPurchase ? 'success' : 'warning'} className="text-xs">
          {transaction.type.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell>
        <div className={`font-semibold ${isPurchase ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
          {formatCurrency(transaction.amount)}
        </div>
        {bonus > 0 && (
          <div className={`text-xs ${isPurchase ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'}`}>
            +{formatCurrency(transaction.bonus_amount)} bonus
          </div>
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
        <Badge variant="info" className="text-xs">
          {transaction.payment_method}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{transaction.created ? formatDate(transaction.created) : '—'}</div>
          <div>{transaction.updated ? formatDate(transaction.updated) : '—'}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-foreground">
          {transaction.operator?.toLowerCase() === 'company' ? 'admin' : transaction.operator}
          {transaction.role?.toLowerCase() !== 'player' && transaction.role?.toLowerCase() !== 'company' && (
            <div className="text-xs text-muted-foreground">{transaction.role}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(transaction)}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface TransactionCardProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
  cardNumber: number;
  isVisible: boolean;
  animationDelay: number;
  isLast: boolean;
  isFirst: boolean;
}

function TransactionCard({ transaction, onView, cardNumber, isVisible, animationDelay, isLast, isFirst }: TransactionCardProps) {
  const bonus = parseFloat(transaction.bonus_amount || '0');
  const isPurchase = transaction.type === 'purchase';
  const statusVariant = mapStatusToVariant(transaction.status);

  return (
    <div 
      className={`relative border rounded-xl overflow-visible hover:shadow-lg transition-all duration-500 ease-out ${
        isPurchase 
          ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200/50 dark:border-green-900/20' 
          : 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-200/50 dark:border-orange-900/20'
      } ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-6'
      }`}
      style={{
        transitionDelay: isVisible ? `${animationDelay}ms` : '0ms',
      }}
    >
      {/* Number Badge - Left Side with Journey Line Connection */}
      <div className="absolute -left-12 top-6 flex flex-col items-center z-10">
        {/* Connecting Line from Previous Card (only for cards after the first) */}
        {!isFirst && (
          <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 w-0.5 bg-primary/30 dark:bg-primary/40 transition-all duration-500 ${
            isVisible ? 'opacity-100' : 'opacity-30'
          }`} style={{ height: '24px' }}></div>
        )}
        
        {/* Number Circle with scroll animation */}
        <div className={`relative w-10 h-10 rounded-full bg-primary text-primary-foreground border-4 border-background dark:border-gray-900 shadow-lg flex items-center justify-center z-10 transition-all duration-700 ease-out hover:scale-110 ${
          isVisible 
            ? 'scale-100 opacity-100 shadow-xl shadow-primary/30 ring-4 ring-primary/30' 
            : 'scale-75 opacity-50 shadow-md'
        }`}
        style={{
          transitionDelay: isVisible ? `${animationDelay}ms` : '0ms',
        }}>
          <span className="text-sm font-extrabold relative z-20 transition-all duration-300">{cardNumber}</span>
          {/* Pulse ring effect when visible - continuous pulse */}
          {isVisible && (
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-75 z-0" style={{ animationDuration: '2s', animationIterationCount: '3' }}></div>
          )}
          {/* Glow effect when visible */}
          {isVisible && (
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse z-0"></div>
          )}
        </div>
        
        {/* Line extending down to next card if not last */}
        {!isLast && (
          <div className={`w-0.5 bg-primary/30 dark:bg-primary/40 mt-2 transition-all duration-500 ${
            isVisible ? 'opacity-100' : 'opacity-30'
          }`} style={{ minHeight: '120px' }}></div>
        )}
      </div>

      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b border-border/50 ${
        isPurchase
          ? 'bg-gradient-to-r from-green-50/60 to-green-50/30 dark:from-green-950/15 dark:to-green-950/5'
          : 'bg-gradient-to-r from-orange-50/60 to-orange-50/30 dark:from-orange-950/15 dark:to-orange-950/5'
      }`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
            {transaction.user_username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-foreground truncate">{transaction.user_username}</div>
            <div className="text-xs text-muted-foreground truncate">{transaction.user_email}</div>
          </div>
        </div>
        <Badge variant={isPurchase ? 'success' : 'warning'} className="text-xs font-semibold px-2.5 py-0.5 shrink-0">
          {transaction.type.toUpperCase()}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Amount Section */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</span>
          <div className="text-right">
            <div className={`text-xl font-extrabold ${isPurchase ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {formatCurrency(transaction.amount)}
            </div>
            {bonus > 0 && (
              <div className={`text-xs font-semibold mt-0.5 ${isPurchase ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'}`}>
                +{formatCurrency(transaction.bonus_amount)} bonus
              </div>
            )}
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Previous</span>
            <div className="text-base font-bold text-foreground">{formatCurrency(transaction.previous_balance)}</div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">New</span>
            <div className="text-base font-bold text-green-600 dark:text-green-400">{formatCurrency(transaction.new_balance)}</div>
          </div>
        </div>

        {/* Status & Payment */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Status</span>
            <Badge variant={statusVariant} className="text-xs capitalize font-semibold px-2.5 py-1">
              {transaction.status}
            </Badge>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Payment</span>
            <Badge variant="info" className="text-xs font-semibold px-2.5 py-1">
              {transaction.payment_method}
            </Badge>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Created</span>
            <div className="text-xs font-medium text-foreground">{transaction.created ? formatDate(transaction.created) : '—'}</div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">Updated</span>
            <div className="text-xs font-medium text-foreground">{transaction.updated ? formatDate(transaction.updated) : '—'}</div>
          </div>
        </div>

        {/* Operator */}
        <div className="pt-2 border-t border-border/50">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">Operator</span>
          <div className="text-sm font-bold text-foreground">
            {transaction.operator?.toLowerCase() === 'company' ? 'admin' : transaction.operator}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`px-5 py-4 border-t border-border/50 ${
        isPurchase
          ? 'bg-green-50/40 dark:bg-green-950/10'
          : 'bg-orange-50/40 dark:bg-orange-950/10'
      }`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(transaction)}
          className="w-full font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          View Details
        </Button>
      </div>
    </div>
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

