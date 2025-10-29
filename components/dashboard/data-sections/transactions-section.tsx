'use client';

import { useEffect, useState } from 'react';
import { useTransactionsStore } from '@/stores';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, TruncatedTextWithCopy } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';

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

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  // Calculate comprehensive stats
  const totalAmount = transactions?.results?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
  const totalBonus = transactions?.results?.reduce((sum, tx) => sum + parseFloat(tx.bonus_amount || '0'), 0) || 0;
  const purchaseCount = transactions?.results?.filter(tx => tx.type === 'purchase').length || 0;
  const cashoutCount = transactions?.results?.filter(tx => tx.type === 'cashout').length || 0;
  const completedCount = transactions?.results?.filter(tx => tx.status === 'completed').length || 0;
  const pendingCount = transactions?.results?.filter(tx => tx.status === 'pending').length || 0;
  const failedCount = transactions?.results?.filter(tx => tx.status === 'failed').length || 0;
  const cancelledCount = transactions?.results?.filter(tx => tx.status === 'cancelled').length || 0;
  
  const successRate = transactions?.results?.length 
    ? ((completedCount / transactions.results.length) * 100).toFixed(1)
    : '0';
  
  const avgTransactionValue = transactions?.results?.length 
    ? (totalAmount / transactions.results.length).toFixed(2)
    : '0';
  
  // Payment method breakdown
  const paymentMethods = transactions?.results?.reduce((acc, tx) => {
    const method = tx.payment_method || 'Unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  // Unique users
  const uniqueUsers = new Set(transactions?.results?.map(tx => tx.user_username) || []).size;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Transactions
              {filter !== 'all' && (
                <span className="ml-3 text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">
                  {filter === 'pending-purchases' ? 'Pending Purchases' :
                   filter === 'pending-cashouts' ? 'Pending Cashouts' :
                   filter.charAt(0).toUpperCase() + filter.slice(1)}
                </span>
              )}
            </h2>
            <p className="text-muted-foreground mt-1">
              View and manage all platform transactions • Total: {transactions?.count.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative space-y-3">
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
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800/50 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-2">Total Transactions</div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {transactions?.count.toLocaleString() || 0}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Showing {transactions?.results?.length || 0} of {transactions?.count || 0}
              </div>
            </div>
            <div className="text-3xl opacity-20">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800/50 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-green-700 dark:text-green-400 font-medium mb-2">Success Rate</div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                {successRate}%
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                {completedCount} completed
              </div>
            </div>
            <div className="text-3xl opacity-20">✓</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800/50 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-purple-700 dark:text-purple-400 font-medium mb-2">Page Volume</div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {formatCurrency(totalAmount)}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                +{formatCurrency(totalBonus)} bonus
              </div>
            </div>
            <div className="text-3xl opacity-20">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 rounded-xl p-5 border border-orange-200 dark:border-orange-800/50 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-orange-700 dark:text-orange-400 font-medium mb-2">Unique Users</div>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                {uniqueUsers}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                Avg: {formatCurrency(avgTransactionValue)}
              </div>
            </div>
            <div className="text-3xl opacity-20">👥</div>
          </div>
        </div>
      </div>

      {/* Secondary Stats - Transaction Types & Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Purchases</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{purchaseCount}</div>
            <div className="text-xs text-gray-500">
              {transactions?.results?.length ? ((purchaseCount / transactions.results.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Cashouts</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{cashoutCount}</div>
            <div className="text-xs text-gray-500">
              {transactions?.results?.length ? ((cashoutCount / transactions.results.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Completed</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{completedCount}</div>
            <Badge variant="success" className="text-xs">✓</Badge>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Pending</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</div>
            <Badge variant="warning" className="text-xs">⏳</Badge>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Failed</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{failedCount}</div>
            <Badge variant="danger" className="text-xs">✗</Badge>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Cancelled</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-gray-600 dark:text-gray-400">{cancelledCount}</div>
            <Badge variant="default" className="text-xs">⊘</Badge>
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      {Object.keys(paymentMethods).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Payment Methods ({Object.keys(paymentMethods).length})
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(paymentMethods).map(([method, count]) => (
              <div 
                key={method}
                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{method}</span>
                <Badge variant="info" className="text-xs">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Table with More Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Transaction Details
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {transactions?.results?.length || 0} transactions shown
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">User Info</TableHead>
                <TableHead className="min-w-[200px]">Transaction Details</TableHead>
                <TableHead className="min-w-[140px]">Amount & Bonus</TableHead>
                <TableHead className="min-w-[140px]">Balance Changes</TableHead>
                <TableHead className="min-w-[120px]">Payment Info</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[160px]">Operator & Role</TableHead>
                <TableHead className="min-w-[160px]">Timestamps</TableHead>
                <TableHead className="min-w-[200px]">Additional Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.results?.map((transaction) => (
                <TableRow key={transaction.id}>
                  {/* User Info */}
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {transaction.user_username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                            {transaction.user_username}
                          </div>
                          <TruncatedTextWithCopy 
                            text={transaction.user_email}
                            maxLength={25}
                            className="text-xs text-gray-500 dark:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Transaction Details */}
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        <TruncatedTextWithCopy 
                          text={transaction.description}
                          maxLength={40}
                        />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-gray-500 dark:text-gray-400">ID:</span>
                          <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">
                            <TruncatedTextWithCopy 
                              text={transaction.unique_id}
                              maxLength={15}
                            />
                          </code>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge 
                            variant={transaction.type === 'purchase' ? 'success' : 'warning'}
                            className="text-xs"
                          >
                            {transaction.type.toUpperCase()}
                          </Badge>
                          <span className="text-gray-400">•</span>
                          <Badge variant="info" className="text-xs max-w-[80px] truncate">
                            {transaction.action || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Amount & Bonus */}
                  <TableCell>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Transaction Amount</div>
                        <div className="font-bold text-blue-600 dark:text-blue-400 text-base">
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <span className={transaction.journal_entry === 'debit' ? 'text-red-600' : 'text-green-600'}>
                            {transaction.journal_entry === 'debit' ? '➖' : '➕'}
                          </span>
                          {transaction.journal_entry} • {transaction.currency}
                        </div>
                      </div>
                      {parseFloat(transaction.bonus_amount) > 0 && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Bonus</div>
                          <div className="text-green-600 dark:text-green-400 font-semibold text-sm">
                            +{formatCurrency(transaction.bonus_amount)}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Balance Changes */}
                  <TableCell>
                    <div className="space-y-1.5">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Previous</div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {formatCurrency(transaction.previous_balance)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <span>→</span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">New Balance</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(transaction.new_balance)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                        Change: <span className={parseFloat(transaction.new_balance) > parseFloat(transaction.previous_balance) ? 'text-green-600' : 'text-red-600'}>
                          {(parseFloat(transaction.new_balance) - parseFloat(transaction.previous_balance)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Payment Info */}
                  <TableCell>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Method</div>
                        <Badge variant="info" className="text-xs">
                          {transaction.payment_method}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Currency: <span className="font-medium text-gray-700 dark:text-gray-300">{transaction.currency}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant={getStatusVariant(transaction.status)} className="text-xs">
                        {transaction.status.toUpperCase()}
                      </Badge>
                      {transaction.status === 'completed' && (
                        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span>✓</span>
                          <span>Verified</span>
                        </div>
                      )}
                      {transaction.status === 'pending' && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                          <span>⏳</span>
                          <span>Processing</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Operator & Role */}
                  <TableCell>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Operator</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {transaction.operator}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Role</div>
                        <Badge variant="default" className="text-xs capitalize">
                          {transaction.role}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>

                  {/* Timestamps */}
                  <TableCell>
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-0.5">Created</div>
                        <div className="text-gray-900 dark:text-gray-100 font-medium">
                          {formatDate(transaction.created)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-0.5">Updated</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {formatDate(transaction.updated)}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Additional Info */}
                  <TableCell>
                    <div className="space-y-2">
                      <div className="text-xs">
                        <div className="text-gray-500 dark:text-gray-400 mb-1">Internal ID</div>
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono block">
                          <TruncatedTextWithCopy 
                            text={transaction.id}
                            maxLength={20}
                          />
                        </code>
                      </div>
                      {transaction.remarks && (
                        <div className="text-xs">
                          <div className="text-gray-500 dark:text-gray-400 mb-1">Remarks</div>
                          <div className="text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded border border-yellow-200 dark:border-yellow-800">
                            <TruncatedTextWithCopy 
                              text={transaction.remarks}
                              maxLength={30}
                            />
                          </div>
                        </div>
                      )}
                      {!transaction.remarks && (
                        <div className="text-xs text-gray-400 italic">
                          No additional remarks
                        </div>
                      )}
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

