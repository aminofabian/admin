'use client';

import { useState, useEffect } from 'react';
import { affiliatesApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
import { 
  Card, CardHeader, CardContent, Table, TableHeader, TableBody, 
  TableRow, TableHead, TableCell, Pagination, SearchInput 
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatDate, formatCurrency, formatPercentage } from '@/lib/utils/formatters';
import type { Affiliate, PaginatedResponse } from '@/types';

export default function AffiliatesPage() {
  const [data, setData] = useState<PaginatedResponse<Affiliate> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();

  useEffect(() => {
    loadAffiliates();
  }, [page, pageSize, debouncedSearch]);

  const loadAffiliates = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await affiliatesApi.list({
        page, page_size: pageSize, search: debouncedSearch || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load affiliates');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={loadAffiliates} />;

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Affiliates</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Affiliates</h2>
            <div className="w-64">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <EmptyState title="No affiliates found" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Commission %</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Total Topup</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell className="font-medium">{affiliate.name}</TableCell>
                      <TableCell>{affiliate.email}</TableCell>
                      <TableCell>{formatPercentage(affiliate.affiliate_percentage)}</TableCell>
                      <TableCell>{affiliate.total_players}</TableCell>
                      <TableCell>{formatCurrency(affiliate.total_earnings)}</TableCell>
                      <TableCell>{formatCurrency(affiliate.total_topup)}</TableCell>
                      <TableCell className="text-xs">{formatDate(affiliate.created)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data && (
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(data.count / pageSize)}
                  onPageChange={setPage}
                  hasNext={!!data.next}
                  hasPrevious={!!data.previous}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

