'use client';

import { useEffect, useState } from 'react';
import type { CreateCompanyRequest, UpdateCompanyRequest } from '@/types';
import { useCompaniesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { LoadingState, ErrorState, EmptyState, CompanyForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Button, Badge, Drawer } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';

export function CompaniesSection() {
  const { user } = useAuth();
  const { 
    companies: data,
    isLoading: loading,
    error,
    currentPage,
    searchTerm,
    pageSize,
    fetchCompanies,
    createCompany,
    setPage,
    setSearchTerm,
  } = useCompaniesStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Check if user has superadmin role
  const isSuperAdmin = user?.role === USER_ROLES.SUPERADMIN;

  useEffect(() => {
    // Only fetch if user is superadmin
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [fetchCompanies, isSuperAdmin]);

  // Show permission denied if not superadmin
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-8 max-w-md text-center">
          <svg className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need <strong>superadmin</strong> privileges to access Company Management.
          </p>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-sm">
            <p className="text-gray-500 dark:text-gray-500">
              Your current role: <span className="font-semibold text-gray-700 dark:text-gray-300">{user?.role || 'unknown'}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchCompanies} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No companies found" />;
  }

  const handleCreateCompany = async (formData: CreateCompanyRequest | UpdateCompanyRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      await createCompany(formData as CreateCompanyRequest);
      
      setIsDrawerOpen(false);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">Companies</h2>
              <p className="text-muted-foreground mt-1">
                Manage all companies and their projects
              </p>
            </div>
          </div>
          <Button 
            variant="primary" 
            size="md" 
            onClick={() => setIsDrawerOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by username, email, or project name..."
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Total Companies</div>
            <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-2xl font-bold text-green-500 mt-1">
              {data?.results?.filter(c => c.is_active).length || 0}
            </div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Inactive</div>
            <div className="text-2xl font-bold text-red-500 mt-1">
              {data?.results?.filter(c => !c.is_active).length || 0}
            </div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">This Page</div>
            <div className="text-2xl font-bold text-foreground mt-1">{data?.results?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
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
      </div>

      {/* Pagination */}
      {data && data.count > pageSize && (
        <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(data.count / pageSize)}
              hasNext={!!data.next}
              hasPrevious={!!data.previous}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
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

