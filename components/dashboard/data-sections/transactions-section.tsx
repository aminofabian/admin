'use client';

import { useEffect } from 'react';
import { useTransactionsStore } from '@/stores';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge } from '@/components/ui';

export function TransactionsSection() {
  const {
    transactions,
    isLoading,
    error,
    searchTerm,
    currentPage,
    filter,
    pageSize,
    fetchTransactions,
    setPage,
    setSearchTerm,
    setFilter,
  } = useTransactionsStore();

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  if (isLoading && !transactions) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchTransactions} />;
  if (!transactions?.results?.length && !searchTerm) {
    return <EmptyState title="No transactions found" />;
  }

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(String(amount)).toFixed(2)}`;
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  const totalAmount = transactions?.results?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transactions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage all platform transactions
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by transaction ID, user, or operator..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-gray-600 dark:text-gray-400 hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('purchases')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'purchases'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-gray-600 dark:text-gray-400 hover:bg-muted/80'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => setFilter('cashouts')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'cashouts'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-gray-600 dark:text-gray-400 hover:bg-muted/80'
            }`}
          >
            Cashouts
          </button>
          <button
            onClick={() => setFilter('processing')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'processing'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-gray-600 dark:text-gray-400 hover:bg-muted/80'
            }`}
          >
            Processing
          </button>
          <button
            onClick={() => setFilter('history')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'history'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-gray-600 dark:text-gray-400 hover:bg-muted/80'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{transactions?.count || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
          <div className="text-2xl font-bold text-blue-500 mt-1">{formatCurrency(totalAmount)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">This Page</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{transactions?.results?.length || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Amount</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {formatCurrency(transactions?.results?.length ? totalAmount / transactions.results.length : 0)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Operator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.results?.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.id}</TableCell>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    {transaction.transaction_id}
                  </code>
                </TableCell>
                <TableCell>{transaction.user_id}</TableCell>
                <TableCell>
                  <Badge variant="info">{transaction.type}</Badge>
                </TableCell>
                <TableCell className="font-semibold text-blue-500">
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">
                  {transaction.operator || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {transactions && transactions.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(transactions.count / pageSize)}
          hasNext={!!transactions.next}
          hasPrevious={!!transactions.previous}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

