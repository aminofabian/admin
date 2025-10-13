'use client';

import { useEffect, useState } from 'react';
import { transactionsApi } from '@/lib/api/transactions';
import type { Transaction, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, Pagination, SearchInput, Badge } from '@/components/ui';

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
          { id: 1, transaction_id: 'TXN001', user_id: 12, type: 'purchase', amount: '100.00', status: 'completed', operator: 'PayPal' },
          { id: 2, transaction_id: 'TXN002', user_id: 15, type: 'cashout', amount: '50.00', status: 'pending', operator: 'Bank Transfer' },
          { id: 3, transaction_id: 'TXN003', user_id: 23, type: 'purchase', amount: '200.00', status: 'completed', operator: 'Stripe' },
          { id: 4, transaction_id: 'TXN004', user_id: 8, type: 'cashout', amount: '75.50', status: 'failed', operator: 'PayPal' },
          { id: 5, transaction_id: 'TXN005', user_id: 45, type: 'purchase', amount: '150.00', status: 'completed', operator: 'Crypto' },
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

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'transaction_id', label: 'Transaction ID' },
    { key: 'user_id', label: 'User ID' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'operator', label: 'Operator' },
  ];

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(String(amount)).toFixed(2)}`;
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': case 'cancelled': return 'error';
      default: return 'info';
    }
  };

  const totalAmount = data?.results?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total Transactions</div>
          <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total Amount</div>
          <div className="text-2xl font-bold text-blue-500 mt-1">{formatCurrency(totalAmount)}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">This Page</div>
          <div className="text-2xl font-bold text-foreground mt-1">{data?.results?.length || 0}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Avg Amount</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {formatCurrency(data?.results?.length ? totalAmount / data.results.length : 0)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table columns={columns}>
          {data?.results?.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-sm">{transaction.id}</td>
              <td className="px-4 py-3 text-sm">
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {transaction.transaction_id}
                </code>
              </td>
              <td className="px-4 py-3 text-sm">{transaction.user_id}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="info">{transaction.type}</Badge>
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-blue-500">
                {formatCurrency(transaction.amount)}
              </td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={getStatusVariant(transaction.status)}>
                  {transaction.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {transaction.operator || '-'}
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {/* Pagination */}
      {data && data.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalItems={data.count}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

