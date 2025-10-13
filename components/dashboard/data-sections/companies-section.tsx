'use client';

import { useEffect, useState } from 'react';
import { companiesApi } from '@/lib/api/companies';
import type { Company, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Button, Badge } from '@/components/ui';

export function CompaniesSection() {
  const [data, setData] = useState<PaginatedResponse<Company> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData: PaginatedResponse<Company> = {
        count: 25,
        next: null,
        previous: null,
        results: [
          { id: 1, username: 'company1', email: 'admin@company1.com', project_name: 'Gaming Platform 1', project_domain: 'https://company1.com', admin_project_domain: 'https://admin.company1.com', is_active: true, created: '2024-01-15T10:30:00Z', modified: '2024-01-15T10:30:00Z' },
          { id: 2, username: 'company2', email: 'admin@company2.com', project_name: 'Gaming Platform 2', project_domain: 'https://company2.com', admin_project_domain: 'https://admin.company2.com', is_active: true, created: '2024-01-16T11:45:00Z', modified: '2024-01-16T11:45:00Z' },
          { id: 3, username: 'company3', email: 'admin@company3.com', project_name: 'Gaming Platform 3', project_domain: 'https://company3.com', admin_project_domain: 'https://admin.company3.com', is_active: false, created: '2024-01-17T09:20:00Z', modified: '2024-01-17T09:20:00Z' },
          { id: 4, username: 'company4', email: 'admin@company4.com', project_name: 'Gaming Platform 4', project_domain: 'https://company4.com', admin_project_domain: 'https://admin.company4.com', is_active: true, created: '2024-01-18T14:30:00Z', modified: '2024-01-18T14:30:00Z' },
          { id: 5, username: 'company5', email: 'admin@company5.com', project_name: 'Gaming Platform 5', project_domain: 'https://company5.com', admin_project_domain: 'https://admin.company5.com', is_active: true, created: '2024-01-19T16:00:00Z', modified: '2024-01-19T16:00:00Z' },
        ]
      };
      
      setData(mockData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchTerm, currentPage]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchCompanies} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No companies found" />;
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
          <h2 className="text-2xl font-bold text-foreground">Companies</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all companies and their projects
          </p>
        </div>
        <Button variant="primary" size="md">
          + Add Company
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by username, email, or project name..."
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total Companies</div>
          <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {data?.results?.filter(c => c.is_active).length || 0}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Inactive</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {data?.results?.filter(c => !c.is_active).length || 0}
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
              <TableHead>Project Name</TableHead>
              <TableHead>Project Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results?.map((company) => (
              <TableRow key={company.id}>
                <TableCell>{company.id}</TableCell>
                <TableCell className="font-medium">{company.username}</TableCell>
                <TableCell>{company.email}</TableCell>
                <TableCell>{company.project_name}</TableCell>
                <TableCell className="text-blue-500 hover:underline">
                  <a href={company.project_domain} target="_blank" rel="noopener noreferrer">
                    {company.project_domain}
                  </a>
                </TableCell>
                <TableCell>
                  <Badge variant={company.is_active ? 'success' : 'danger'}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(company.created)}
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

