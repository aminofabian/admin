'use client';

import { useEffect } from 'react';
import { useSearch } from '@/lib/hooks';
import { useTransactionsStore } from '@/stores';
import { 
  Card, 
  CardContent, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Badge,
  Pagination,
  SearchInput,
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';

export default function TransactionsPage() {
  const { 
    transactions,
    isLoading,
    error,
    currentPage,
    pageSize,
    filter,
    setPage,
    setSearchTerm,
    setFilter,
    fetchTransactions,
  } = useTransactionsStore();

  const { search, debouncedSearch, setSearch } = useSearch();

  // Initial load
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle debounced search
  useEffect(() => {
    if (debouncedSearch !== undefined) {
      setSearchTerm(debouncedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  // Calculate stats
  const totalAmount = transactions?.results?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
  const completedCount = transactions?.results?.filter(tx => tx.status === 'completed').length || 0;
  const pendingCount = transactions?.results?.filter(tx => tx.status === 'pending').length || 0;
  const failedCount = transactions?.results?.filter(tx => tx.status === 'failed').length || 0;

  if (isLoading && !transactions) {
    return <LoadingState />;
  }

  if (error && !transactions) {
    return <ErrorState message={error} onRetry={fetchTransactions} />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Transactions
              {filter !== 'all' && (
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  {filter === 'pending-purchases' ? 'Pending Purchases' :
                   filter === 'pending-cashouts' ? 'Pending Cashouts' :
                   filter.charAt(0).toUpperCase() + filter.slice(1)}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive transaction management and analytics
            </p>
          </div>
        </div>

        {/* Search and Stats Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="w-full lg:w-96">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, email, transaction ID, or description..."
            />
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{transactions?.count.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-600 dark:text-gray-400">Completed:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{completedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Pending:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{pendingCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-600"></div>
              <span className="text-gray-600 dark:text-gray-400">Failed:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{failedCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'all', label: 'All Transactions', color: 'bg-gray-700' },
            { value: 'processing', label: 'Processing', color: 'bg-gray-600' },
            { value: 'history', label: 'History', color: 'bg-gray-500' },
            { value: 'purchases', label: 'Purchases', color: 'bg-gray-600' },
            { value: 'cashouts', label: 'Cashouts', color: 'bg-gray-500' },
            { value: 'pending-purchases', label: 'Pending Purchases', color: 'bg-gray-600' },
            { value: 'pending-cashouts', label: 'Pending Cashouts', color: 'bg-gray-500' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? `${f.color} text-white shadow-md`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {transactions?.results.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                title="No transactions found" 
                description="No transactions match your current filters"
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.results.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        {/* User Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm font-semibold">
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

                        {/* Transaction Details */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                              {transaction.description}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={transaction.type === 'purchase' ? 'success' : 'warning'}
                                className="text-xs"
                              >
                                {transaction.type.toUpperCase()}
                              </Badge>
                              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                                {transaction.unique_id}
                              </code>
                            </div>
                          </div>
                        </TableCell>

                        {/* Amount */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-bold text-gray-900 dark:text-gray-100 text-base">
                              {formatCurrency(transaction.amount)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <span className="text-gray-500 dark:text-gray-400">
                                {transaction.journal_entry === 'debit' ? '➖' : '➕'}
                              </span>
                              {transaction.journal_entry} • {transaction.currency}
                            </div>
                            {parseFloat(transaction.bonus_amount) > 0 && (
                              <div className="text-gray-600 dark:text-gray-400 font-semibold text-sm">
                                +{formatCurrency(transaction.bonus_amount)} bonus
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={getStatusVariant(transaction.status)} className="text-xs">
                              {transaction.status.toUpperCase()}
                            </Badge>
                            {transaction.status === 'completed' && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span>✓</span>
                                <span>Verified</span>
                              </div>
                            )}
                            {transaction.status === 'pending' && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                <span>⏳</span>
                                <span>Processing</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Payment Info */}
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="info" className="text-xs">
                              {transaction.payment_method}
                            </Badge>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {transaction.currency}
                            </div>
                          </div>
                        </TableCell>

                        {/* Created Date */}
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {transaction.created ? formatDate(transaction.created) : 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {transactions && transactions.count > pageSize && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(transactions.count / pageSize)}
                    onPageChange={setPage}
                    hasNext={!!transactions.next}
                    hasPrevious={!!transactions.previous}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

