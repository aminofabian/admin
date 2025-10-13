'use client';

import { useEffect, useState } from 'react';
import { transactionsApi } from '@/lib/api/transactions';
import type { Transaction, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge } from '@/components/ui';

export function TransactionsSection() {
  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'purchases' | 'cashouts' | 'processing' | 'history'>('all');
  const pageSize = 10;

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData: PaginatedResponse<Transaction> = {
        count: 200,
        next: null,
        previous: null,
        results: [
          { id: 1, transaction_id: 'TXN001', user_id: 12, type: 'purchase', amount: '100.00', status: 'completed', operator: 'PayPal', created: '2024-01-15T10:30:00Z', modified: '2024-01-15T10:30:00Z' },
          { id: 2, transaction_id: 'TXN002', user_id: 15, type: 'cashout', amount: '50.00', status: 'pending', operator: 'Bank Transfer', created: '2024-01-16T11:45:00Z', modified: '2024-01-16T11:45:00Z' },
          { id: 3, transaction_id: 'TXN003', user_id: 23, type: 'purchase', amount: '200.00', status: 'completed', operator: 'Stripe', created: '2024-01-17T09:20:00Z', modified: '2024-01-17T09:20:00Z' },
          { id: 4, transaction_id: 'TXN004', user_id: 8, type: 'cashout', amount: '75.50', status: 'failed', operator: 'PayPal', created: '2024-01-18T14:30:00Z', modified: '2024-01-18T14:30:00Z' },
          { id: 5, transaction_id: 'TXN005', user_id: 45, type: 'purchase', amount: '150.00', status: 'completed', operator: 'Crypto', created: '2024-01-19T16:00:00Z', modified: '2024-01-19T16:00:00Z' },
        ]
      };
      
      setData(mockData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchTerm, currentPage, filter]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchTransactions} />;
  if (!data?.results?.length && !searchTerm) {
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

  const totalAmount = data?.results?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;

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
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
          <div className="text-2xl font-bold text-blue-500 mt-1">{formatCurrency(totalAmount)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">This Page</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data?.results?.length || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Amount</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {formatCurrency(data?.results?.length ? totalAmount / data.results.length : 0)}
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
            {data?.results?.map((transaction) => (
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
      {data && data.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(data.count / pageSize)}
          hasNext={!!data.next}
          hasPrevious={!!data.previous}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

