'use client';

import { useEffect } from 'react';
import { useSearch } from '@/lib/hooks';
import { useTransactionsStore } from '@/stores';
import { 
  Card, 
  CardHeader, 
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

  if (isLoading && !transactions) {
    return <LoadingState />;
  }

  if (error && !transactions) {
    return <ErrorState message={error} onRetry={fetchTransactions} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Transactions
            {filter !== 'all' && (
              <span className="ml-3 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/30 px-3 py-1.5 rounded-lg">
                {filter === 'pending-purchases' ? 'Pending Purchases' :
                 filter === 'pending-cashouts' ? 'Pending Cashouts' :
                 filter.charAt(0).toUpperCase() + filter.slice(1)}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive transaction management and analytics • Total: {transactions?.count.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username, email, transaction ID, or description..."
        />
      </div>

      {/* Filter Buttons */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {([
            { value: 'all', label: 'All Transactions', color: 'bg-blue-600' },
            { value: 'processing', label: 'Processing', color: 'bg-purple-600' },
            { value: 'history', label: 'History', color: 'bg-gray-600' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? `${f.color} text-white shadow-md`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground font-medium">Transaction Types:</span>
          {([
            { value: 'purchases', label: 'Purchases', color: 'bg-green-600' },
            { value: 'cashouts', label: 'Cashouts', color: 'bg-orange-600' },
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

        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground font-medium">Pending Only:</span>
          {([
            { value: 'pending-purchases', label: 'Pending Purchases', color: 'bg-green-500' },
            { value: 'pending-cashouts', label: 'Pending Cashouts', color: 'bg-orange-500' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? `${f.color} text-white shadow-md`
                  : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/50 border border-green-200 dark:border-green-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50">
          <CardContent className="p-5">
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
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50">
          <CardContent className="p-5">
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
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800/50">
          <CardContent className="p-5">
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
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/50">
          <CardContent className="p-5">
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
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats - Transaction Types & Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Purchases</div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{purchaseCount}</div>
              <div className="text-xs text-muted-foreground">
                {transactions?.results?.length ? ((purchaseCount / transactions.results.length) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Cashouts</div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{cashoutCount}</div>
              <div className="text-xs text-muted-foreground">
                {transactions?.results?.length ? ((cashoutCount / transactions.results.length) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Completed</div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{completedCount}</div>
              <Badge variant="success" className="text-xs">✓</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Pending</div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</div>
              <Badge variant="warning" className="text-xs">⏳</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Failed</div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{failedCount}</div>
              <Badge variant="danger" className="text-xs">✗</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Cancelled</div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-bold text-gray-600 dark:text-gray-400">{cancelledCount}</div>
              <Badge variant="default" className="text-xs">⊘</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      {Object.keys(paymentMethods).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-semibold text-foreground mb-3">
              Payment Methods ({Object.keys(paymentMethods).length})
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(paymentMethods).map(([method, count]) => (
                <div 
                  key={method}
                  className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border"
                >
                  <span className="text-sm font-medium text-foreground">{method}</span>
                  <Badge variant="info" className="text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Table */}
      <Card>
        <CardHeader className="border-b bg-muted/50">
          <div>
            <h2 className="text-lg font-semibold">Transaction Details</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Comprehensive transaction information with all available data
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {transactions?.results.length === 0 ? (
            <EmptyState 
              title="No transactions found" 
              description="No transactions match your current filters"
            />
          ) : (
            <>
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
                    {transactions?.results.map((transaction) => (
                      <TableRow key={transaction.id}>
                        {/* User Info */}
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                {transaction.user_username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground text-sm">
                                  {transaction.user_username}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {transaction.user_email}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Transaction Details */}
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="text-sm font-medium text-foreground">
                              {transaction.description}
                            </div>
                            <div className="space-y-0.5 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">ID:</span>
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                  {transaction.unique_id}
                                </code>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge 
                                  variant={transaction.type === 'purchase' ? 'success' : 'warning'}
                                  className="text-xs"
                                >
                                  {transaction.type.toUpperCase()}
                                </Badge>
                                <span className="text-muted-foreground">•</span>
                                <Badge variant="info" className="text-xs">
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
                              <div className="text-xs text-muted-foreground mb-0.5">Transaction Amount</div>
                              <div className="font-bold text-blue-600 dark:text-blue-400 text-base">
                                {formatCurrency(transaction.amount)}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className={transaction.journal_entry === 'debit' ? 'text-red-600' : 'text-green-600'}>
                                  {transaction.journal_entry === 'debit' ? '➖' : '➕'}
                                </span>
                                {transaction.journal_entry} • {transaction.currency}
                              </div>
                            </div>
                            {parseFloat(transaction.bonus_amount) > 0 && (
                              <div className="pt-2 border-t border-border">
                                <div className="text-xs text-muted-foreground mb-0.5">Bonus</div>
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
                              <div className="text-xs text-muted-foreground">Previous</div>
                              <div className="text-sm font-medium text-muted-foreground">
                                {formatCurrency(transaction.previous_balance)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <span>→</span>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">New Balance</div>
                              <div className="text-sm font-bold text-foreground">
                                {formatCurrency(transaction.new_balance)}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground pt-1 border-t border-border">
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
                              <div className="text-xs text-muted-foreground mb-1">Method</div>
                              <Badge variant="info" className="text-xs">
                                {transaction.payment_method}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Currency: <span className="font-medium text-foreground">{transaction.currency}</span>
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
                              <div className="text-xs text-muted-foreground mb-0.5">Operator</div>
                              <div className="text-sm font-medium text-foreground">
                                {transaction.operator}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Role</div>
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
                              <div className="text-muted-foreground mb-0.5">Created</div>
                              <div className="text-foreground font-medium">
                                {formatDate(transaction.created)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-0.5">Updated</div>
                              <div className="text-muted-foreground">
                                {formatDate(transaction.updated)}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Additional Info */}
                        <TableCell>
                          <div className="space-y-2">
                            <div className="text-xs">
                              <div className="text-muted-foreground mb-1">Internal ID</div>
                              <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                {transaction.id}
                              </code>
                            </div>
                            {transaction.remarks && (
                              <div className="text-xs">
                                <div className="text-muted-foreground mb-1">Remarks</div>
                                <div className="text-foreground bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded border border-yellow-200 dark:border-yellow-800">
                                  {transaction.remarks}
                                </div>
                              </div>
                            )}
                            {!transaction.remarks && (
                              <div className="text-xs text-muted-foreground italic">
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
              {transactions && transactions.count > pageSize && (
                <div className="p-4 border-t">
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

