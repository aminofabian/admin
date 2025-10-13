'use client';

import { useEffect, useState } from 'react';
import { companiesApi } from '@/lib/api/companies';
import type { Company, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, Pagination, SearchInput, Button, Badge } from '@/components/ui';

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

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'project_name', label: 'Project Name' },
    { key: 'project_domain', label: 'Project Domain' },
    { key: 'is_active', label: 'Status' },
    { key: 'created', label: 'Created' },
  ];

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
        <Table columns={columns}>
          {data?.results?.map((company) => (
            <tr key={company.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-sm">{company.id}</td>
              <td className="px-4 py-3 text-sm font-medium">{company.username}</td>
              <td className="px-4 py-3 text-sm">{company.email}</td>
              <td className="px-4 py-3 text-sm">{company.project_name}</td>
              <td className="px-4 py-3 text-sm text-blue-500 hover:underline">
                <a href={company.project_domain} target="_blank" rel="noopener noreferrer">
                  {company.project_domain}
                </a>
              </td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={company.is_active ? 'success' : 'error'}>
                  {company.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(company.created)}
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

