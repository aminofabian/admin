'use client';

import { useState, useEffect } from 'react';
import { managersApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
import { 
  Card, CardHeader, CardContent, Table, TableHeader, TableBody, 
  TableRow, TableHead, TableCell, Badge, Pagination, SearchInput, Button 
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Manager, PaginatedResponse } from '@/types';

export default function ManagersPage() {
  const [data, setData] = useState<PaginatedResponse<Manager> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();

  useEffect(() => {
    loadManagers();
  }, [page, pageSize, debouncedSearch]);

  const loadManagers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await managersApi.list({
        page, page_size: pageSize, search: debouncedSearch || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load managers');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={loadManagers} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Managers</h1>
        <Button>Add Manager</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Managers</h2>
            <div className="w-64">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <EmptyState title="No managers found" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">{manager.username}</TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>
                        <Badge variant={manager.is_active ? 'success' : 'danger'}>
                          {manager.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(manager.created)}</TableCell>
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

