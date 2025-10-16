'use client';

import { useEffect, useState } from 'react';
import { useTransactionsStore } from '@/stores';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge } from '@/components/ui';

export function TransactionsSection() {
  const {
    transactions,
    isLoading,
    error,
    searchTerm: storeSearchTerm,
    currentPage,
    filter,
    pageSize,
    fetchTransactions,
    setPage,
    setSearchTerm,
    setFilter,
  } = useTransactionsStore();

  const [localSearchTerm, setLocalSearchTerm] = useState(storeSearchTerm);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== storeSearchTerm) {
        setSearchTerm(localSearchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm, storeSearchTerm, setSearchTerm]);

  if (isLoading && !transactions) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchTransactions} />;
  if (!transactions?.results?.length && !storeSearchTerm) {
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
  const totalBonus = transactions?.results?.reduce((sum, tx) => sum + parseFloat(tx.bonus_amount || '0'), 0) || 0;
  const purchaseCount = transactions?.results?.filter(tx => tx.type === 'purchase').length || 0;
  const cashoutCount = transactions?.results?.filter(tx => tx.type === 'cashout').length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Transactions
            {filter !== 'all' && (
              <span className="ml-3 text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">
                {filter === 'pending-purchases' ? 'Pending Purchases' :
                 filter === 'pending-cashouts' ? 'Pending Cashouts' :
                 filter.charAt(0).toUpperCase() + filter.slice(1)}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage all platform transactions • Total: {transactions?.count.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <SearchInput
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          placeholder="Search by username, email, description, or transaction ID..."
        />
        
        {/* Filter Buttons */}
        <div className="space-y-2">
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
          
          {/* Pending Filters */}
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-center">
              Pending Only:
            </span>
            <button
              onClick={() => setFilter('pending-purchases')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending-purchases'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/50'
              }`}
            >
              Pending Purchases
            </button>
            <button
              onClick={() => setFilter('pending-cashouts')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending-cashouts'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/50'
              }`}
            >
              Pending Cashouts
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800/50">
          <div className="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Transactions</div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
            {transactions?.count.toLocaleString() || 0}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Overall count</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Page Amount</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(totalAmount)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current page only</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Page Bonus</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totalBonus)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current page only</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Page Purchases</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{purchaseCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">of {transactions?.results?.length || 0} shown</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Page Cashouts</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{cashoutCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">of {transactions?.results?.length || 0} shown</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.results?.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.user_username}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {transaction.user_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {transaction.description}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ID: <code className="bg-muted px-1 rounded">{transaction.id}</code>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(transaction.amount)} {transaction.currency}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {transaction.journal_entry === 'debit' ? '➖ Debit' : '➕ Credit'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {parseFloat(transaction.bonus_amount) > 0 ? (
                      <div className="text-green-600 dark:text-green-400 font-medium">
                        +{formatCurrency(transaction.bonus_amount)}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="text-xs">
                      {transaction.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      <div className="text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Prev:</span> {formatCurrency(transaction.previous_balance)}
                      </div>
                      <div className="text-gray-900 dark:text-gray-100 font-semibold">
                        <span className="font-medium">New:</span> {formatCurrency(transaction.new_balance)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={transaction.type === 'purchase' ? 'success' : 'warning'}
                      className="text-xs"
                    >
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {transaction.created}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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

