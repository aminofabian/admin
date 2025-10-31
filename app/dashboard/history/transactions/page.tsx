'use client';

import { useEffect } from 'react';
import { useSearch } from '@/lib/hooks';
import { useTransactionsStore } from '@/stores';
import { 
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

  // Set filter to history on mount
  useEffect(() => {
    setFilter('history');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  // Calculate stats
  const completedCount = transactions?.results?.filter(tx => tx.status === 'completed').length || 0;
  const cancelledCount = transactions?.results?.filter(tx => tx.status === 'cancelled').length || 0;
  const totalAmount = transactions?.results?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;

  if (isLoading && !transactions) {
    return <LoadingState />;
  }

  if (error && !transactions) {
    return <ErrorState message={error} onRetry={fetchTransactions} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground mt-1">
            View completed and cancelled transactions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Transactions</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{transactions?.count || 0}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Completed</span>
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Cancelled</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-muted-foreground">{cancelledCount}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totalAmount.toString())}</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="w-full max-w-md">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, transaction ID..."
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {transactions?.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No transaction history" 
              description="No completed or cancelled transactions found"
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
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.results.map((transaction) => (
                    <TableRow key={transaction.id}>
                      {/* User Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-xs">
                              {transaction.user_username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{transaction.user_username}</div>
                            <div className="text-xs text-muted-foreground">{transaction.user_email}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Transaction Details */}
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

                      {/* Amount */}
                      <TableCell>
                        <div className="font-bold">{formatCurrency(transaction.amount)}</div>
                        {parseFloat(transaction.bonus_amount) > 0 && (
                          <div className="text-xs text-muted-foreground">+{formatCurrency(transaction.bonus_amount)} bonus</div>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={getStatusVariant(transaction.status)} className="capitalize">
                          {transaction.status}
                        </Badge>
                      </TableCell>

                      {/* Payment */}
                      <TableCell>
                        <Badge variant="info">{transaction.payment_method}</Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <div className="text-sm">{transaction.created ? formatDate(transaction.created) : 'N/A'}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {transactions && transactions.count > 10 && (
              <div className="border-t border-border px-4 py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(transactions.count / 10)}
                  onPageChange={setPage}
                  hasNext={!!transactions.next}
                  hasPrevious={!!transactions.previous}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
