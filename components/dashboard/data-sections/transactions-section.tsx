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
      <div className="bg-card p-6 border border-border shadow-sm rounded-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-muted flex items-center justify-center border border-border rounded-lg">
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="bg-card p-4 border border-border shadow-sm rounded-lg">
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
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('purchases')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'purchases'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Purchases
              </button>
              <button
                onClick={() => setFilter('cashouts')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'cashouts'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Cashouts
              </button>
              <button
                onClick={() => setFilter('processing')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'processing'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Processing
              </button>
              <button
                onClick={() => setFilter('history')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'history'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                History
              </button>
            </div>
            
            {/* Pending Filters */}
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1.5 text-xs text-muted-foreground flex items-center">
                Pending Only:
              </span>
              <button
                onClick={() => setFilter('pending-purchases')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'pending-purchases'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Pending Purchases
              </button>
              <button
                onClick={() => setFilter('pending-cashouts')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'pending-cashouts'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Pending Cashouts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Total Transactions</div>
          <div className="text-2xl font-bold text-foreground">
            {transactions?.count.toLocaleString() || 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Showing {transactions?.results?.length || 0} of {transactions?.count || 0}
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Success Rate</div>
          <div className="text-2xl font-bold text-foreground">
            {successRate}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {completedCount} completed
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Page Volume</div>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(totalAmount)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            +{formatCurrency(totalBonus)} bonus
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Unique Users</div>
          <div className="text-2xl font-bold text-foreground">
            {uniqueUsers}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Avg: {formatCurrency(avgTransactionValue)}
          </div>
        </div>
      </div>

      {/* Secondary Stats - Transaction Types & Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Purchases</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-foreground">{purchaseCount}</div>
            <div className="text-xs text-muted-foreground">
              {transactions?.results?.length ? ((purchaseCount / transactions.results.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Cashouts</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-foreground">{cashoutCount}</div>
            <div className="text-xs text-muted-foreground">
              {transactions?.results?.length ? ((cashoutCount / transactions.results.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Completed</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-foreground">{completedCount}</div>
            <Badge variant="success" className="text-xs">✓</Badge>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Pending</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-foreground">{pendingCount}</div>
            <Badge variant="warning" className="text-xs">⏳</Badge>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Failed</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-foreground">{failedCount}</div>
            <Badge variant="danger" className="text-xs">✗</Badge>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="text-xs text-muted-foreground font-medium mb-1">Cancelled</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold text-foreground">{cancelledCount}</div>
            <Badge variant="default" className="text-xs">⊘</Badge>
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      {Object.keys(paymentMethods).length > 0 && (
        <div className="bg-card rounded-lg p-4 border border-border">
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
        </div>
      )}

      {/* Enhanced Table with More Details */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Transaction Details
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
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
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                          {transaction.user_username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground text-sm truncate">
                            {transaction.user_username}
                          </div>
                          <TruncatedTextWithCopy 
                            text={transaction.user_email}
                            maxLength={25}
                            className="text-xs text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Transaction Details */}
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="text-sm font-medium text-foreground">
                        <TruncatedTextWithCopy 
                          text={transaction.description}
                          maxLength={40}
                        />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-muted-foreground">ID:</span>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono border border-border">
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
                          <span className="text-muted-foreground">•</span>
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
                        <div className="text-xs text-muted-foreground mb-0.5">Transaction Amount</div>
                        <div className="font-bold text-primary text-base">
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className={transaction.journal_entry === 'debit' ? 'text-red-500' : 'text-green-500'}>
                            {transaction.journal_entry === 'debit' ? '➖' : '➕'}
                          </span>
                          {transaction.journal_entry} • {transaction.currency}
                        </div>
                      </div>
                      {parseFloat(transaction.bonus_amount) > 0 && (
                        <div className="pt-2 border-t border-border">
                          <div className="text-xs text-muted-foreground mb-0.5">Bonus</div>
                          <div className="text-green-600 dark:text-green-500 font-semibold text-sm">
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
                        <div className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                          <span>✓</span>
                          <span>Verified</span>
                        </div>
                      )}
                      {transaction.status === 'pending' && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
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
                        <div className="text-sm font-medium text-foreground truncate">
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
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono block border border-border">
                          <TruncatedTextWithCopy 
                            text={transaction.id}
                            maxLength={20}
                          />
                        </code>
                      </div>
                      {transaction.remarks && (
                        <div className="text-xs">
                          <div className="text-muted-foreground mb-1">Remarks</div>
                          <div className="text-foreground bg-accent px-2 py-1 rounded border border-border">
                            <TruncatedTextWithCopy 
                              text={transaction.remarks}
                              maxLength={30}
                            />
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

