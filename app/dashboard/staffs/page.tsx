'use client';

import { useState, useEffect } from 'react';
import { staffsApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
import { 
  Card, CardHeader, CardContent, Table, TableHeader, TableBody, 
  TableRow, TableHead, TableCell, Badge, Pagination, SearchInput, Button 
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Staff, PaginatedResponse } from '@/types';

export default function StaffsPage() {
  const [data, setData] = useState<PaginatedResponse<Staff> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();

  useEffect(() => {
    loadStaffs();
  }, [page, pageSize, debouncedSearch]);

  const loadStaffs = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await staffsApi.list({
        page, page_size: pageSize, search: debouncedSearch || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staffs');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={loadStaffs} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Staff</h1>
        <Button>Add Staff</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Staff</h2>
            <div className="w-64">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <EmptyState title="No staff found" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.username}</TableCell>
                      <TableCell>{staff.email}</TableCell>
                      <TableCell>{staff.mobile_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={staff.is_active ? 'success' : 'danger'}>
                          {staff.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(staff.created)}</TableCell>
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

