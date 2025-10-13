'use client';

import { useEffect, useState } from 'react';
import { agentsApi } from '@/lib/api/users';
import type { Agent, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button } from '@/components/ui';

export function AgentsSection() {
  const [data, setData] = useState<PaginatedResponse<Agent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData: PaginatedResponse<Agent> = {
        count: 18,
        next: null,
        previous: null,
        results: [
          { id: 1, username: 'agent1', email: 'agent1@example.com', role: 'agent', is_active: true, project_id: 1, created: '2024-01-15T10:30:00Z', modified: '2024-01-15T10:30:00Z' },
          { id: 2, username: 'agent2', email: 'agent2@example.com', role: 'agent', is_active: true, project_id: 1, created: '2024-01-16T11:45:00Z', modified: '2024-01-16T11:45:00Z' },
          { id: 3, username: 'agent3', email: 'agent3@example.com', role: 'agent', is_active: true, project_id: 1, created: '2024-01-17T09:20:00Z', modified: '2024-01-17T09:20:00Z' },
          { id: 4, username: 'agent4', email: 'agent4@example.com', role: 'agent', is_active: false, project_id: 1, created: '2024-01-18T14:30:00Z', modified: '2024-01-18T14:30:00Z' },
        ]
      };
      
      setData(mockData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [searchTerm, currentPage]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchAgents} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No agents found" />;
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
          <h2 className="text-2xl font-bold text-foreground">Agents</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all agent accounts and their affiliates
          </p>
        </div>
        <Button variant="primary" size="md">
          + Add Agent
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
          <div className="text-sm text-muted-foreground">Total Agents</div>
          <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {data?.results?.filter(a => a.is_active).length || 0}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Inactive</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {data?.results?.filter(a => !a.is_active).length || 0}
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
            {data?.results?.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>{agent.id}</TableCell>
                <TableCell className="font-medium">{agent.username}</TableCell>
                <TableCell>{agent.email}</TableCell>
                <TableCell>
                  <Badge variant="info">{agent.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={agent.is_active ? 'success' : 'danger'}>
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(agent.created)}
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

