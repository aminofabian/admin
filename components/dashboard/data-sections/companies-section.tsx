'use client';

import { useEffect, useState } from 'react';
import { companiesApi } from '@/lib/api/companies';
import type { Company, PaginatedResponse, CreateCompanyRequest, UpdateCompanyRequest } from '@/types';
import { LoadingState, ErrorState, EmptyState, CompanyForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Button, Badge, Drawer } from '@/components/ui';

export function CompaniesSection() {
  const [data, setData] = useState<PaginatedResponse<Company> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
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

  const handleCreateCompany = async (formData: CreateCompanyRequest | UpdateCompanyRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      // Using mock API - replace with companiesApi.create when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setIsDrawerOpen(false);
      await fetchCompanies();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create company';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSubmitError('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Companies</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all companies and their projects
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsDrawerOpen(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Company
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
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Companies</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-500 dark:text-green-400 mt-1">
            {data?.results?.filter(c => c.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
          <div className="text-2xl font-bold text-red-500 dark:text-red-400 mt-1">
            {data?.results?.filter(c => !c.is_active).length || 0}
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
                <TableCell className="text-blue-500 dark:text-blue-400 hover:underline">
                  <a href={company.project_domain} target="_blank" rel="noopener noreferrer">
                    {company.project_domain}
                  </a>
                </TableCell>
                <TableCell>
                  <Badge variant={company.is_active ? 'success' : 'danger'}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">
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

      {/* Add Company Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Create New Company"
        size="xl"
      >
        {submitError && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{submitError}</span>
          </div>
        )}
        <CompanyForm
          onSubmit={handleCreateCompany}
          onCancel={handleCloseDrawer}
          isLoading={isSubmitting}
        />
      </Drawer>
    </div>
  );
}

