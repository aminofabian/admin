'use client';

import { useEffect, useState } from 'react';
import { staffsApi } from '@/lib/api/users';
import type { Staff, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button } from '@/components/ui';

export function StaffsSection() {
  const [data, setData] = useState<PaginatedResponse<Staff> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchStaffs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData: PaginatedResponse<Staff> = {
        count: 8,
        next: null,
        previous: null,
        results: [
          { id: 1, username: 'staff1', email: 'staff1@example.com', role: 'staff', mobile_number: '+1234567890', is_active: true, project_id: 1, created: '2024-01-15T10:30:00Z', modified: '2024-01-15T10:30:00Z' },
          { id: 2, username: 'staff2', email: 'staff2@example.com', role: 'staff', mobile_number: '+1234567891', is_active: true, project_id: 1, created: '2024-01-16T11:45:00Z', modified: '2024-01-16T11:45:00Z' },
          { id: 3, username: 'staff3', email: 'staff3@example.com', role: 'staff', mobile_number: '+1234567892', is_active: false, project_id: 1, created: '2024-01-17T09:20:00Z', modified: '2024-01-17T09:20:00Z' },
        ]
      };
      
      setData(mockData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, [searchTerm, currentPage]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchStaffs} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No staff members found" />;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Staff Members</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all staff accounts and permissions
          </p>
        </div>
        <Button variant="primary" size="md">
          + Add Staff
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by username, email, or mobile..."
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Staff</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {data?.results?.filter(s => s.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {data?.results?.filter(s => !s.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">This Page</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data?.results?.length || 0}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results?.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>{staff.id}</TableCell>
                <TableCell className="font-medium">{staff.username}</TableCell>
                <TableCell>{staff.email}</TableCell>
                <TableCell>{staff.mobile_number || '-'}</TableCell>
                <TableCell>
                  <Badge variant="info">{staff.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={staff.is_active ? 'success' : 'danger'}>
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">
                  {formatDate(staff.created)}
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

