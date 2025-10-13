'use client';

import { useEffect, useState } from 'react';
import { managersApi } from '@/lib/api/users';
import type { Manager, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button } from '@/components/ui';

export function ManagersSection() {
  const [data, setData] = useState<PaginatedResponse<Manager> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchManagers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData: PaginatedResponse<Manager> = {
        count: 12,
        next: null,
        previous: null,
        results: [
          { id: 1, username: 'manager1', email: 'manager1@example.com', role: 'manager', is_active: true, project_id: 1, created: '2024-01-15T10:30:00Z', modified: '2024-01-15T10:30:00Z' },
          { id: 2, username: 'manager2', email: 'manager2@example.com', role: 'manager', is_active: true, project_id: 1, created: '2024-01-16T11:45:00Z', modified: '2024-01-16T11:45:00Z' },
          { id: 3, username: 'manager3', email: 'manager3@example.com', role: 'manager', is_active: false, project_id: 1, created: '2024-01-17T09:20:00Z', modified: '2024-01-17T09:20:00Z' },
        ]
      };
      
      setData(mockData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, [searchTerm, currentPage]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchManagers} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No managers found" />;
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
          <h2 className="text-2xl font-bold text-foreground">Managers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all manager accounts and permissions
          </p>
        </div>
        <Button variant="primary" size="md">
          + Add Manager
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by username or email..."
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total Managers</div>
          <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {data?.results?.filter(m => m.is_active).length || 0}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Inactive</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {data?.results?.filter(m => !m.is_active).length || 0}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">This Page</div>
          <div className="text-2xl font-bold text-foreground mt-1">{data?.results?.length || 0}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results?.map((manager) => (
              <TableRow key={manager.id}>
                <TableCell>{manager.id}</TableCell>
                <TableCell className="font-medium">{manager.username}</TableCell>
                <TableCell>{manager.email}</TableCell>
                <TableCell>
                  <Badge variant="info">{manager.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={manager.is_active ? 'success' : 'error'}>
                    {manager.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(manager.created)}
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
          totalItems={data.count}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

