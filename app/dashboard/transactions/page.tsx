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

  if (isLoading && !transactions) {
    return <LoadingState />;
  }

  if (error && !transactions) {
    return <ErrorState message={error} onRetry={fetchTransactions} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {([
          { value: 'all', label: 'All' },
          { value: 'processing', label: 'Processing' },
          { value: 'history', label: 'History' },
          { value: 'purchases', label: 'Purchases' },
          { value: 'cashouts', label: 'Cashouts' },
          { value: 'pending-purchases', label: 'Pending Purchases' },
          { value: 'pending-cashouts', label: 'Pending Cashouts' },
        ] as const).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Transactions</h2>
            <div className="w-64">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {transactions?.results.length === 0 ? (
            <EmptyState 
              title="No transactions found" 
              description="No transactions available"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.results.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.unique_id}</TableCell>
                      <TableCell>{transaction.user_username}</TableCell>
                      <TableCell className="capitalize">{transaction.type}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.operator}</TableCell>
                      <TableCell className="text-xs">{formatDate(transaction.created)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {transactions && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(transactions.count / pageSize)}
                  onPageChange={setPage}
                  hasNext={!!transactions.next}
                  hasPrevious={!!transactions.previous}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

