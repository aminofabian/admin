'use client';

import { useState, useEffect } from 'react';
import { useCompanySettingsStore } from '@/stores';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { Drawer } from '@/components/ui/drawer';
import { CompanySettingsForm } from '@/components/features';
import { LoadingState, ErrorState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { CompanySettings, CreateCompanyRequest, UpdateCompanyRequest } from '@/types';

export function CompanySettingsSection() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanySettings | null>(null);

  const {
    companies: companiesData,
    isLoading,
    error,
    currentPage,
    searchTerm,
    fetchCompanies,
    createCompany,
    updateCompany,
    patchCompany,
    setPage,
    setSearchTerm,
  } = useCompanySettingsStore();

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSubmit = async (formData: CreateCompanyRequest | UpdateCompanyRequest) => {
    try {
      if (selectedCompany) {
        await updateCompany(selectedCompany.id, formData as UpdateCompanyRequest);
      } else {
        await createCompany(formData as CreateCompanyRequest);
      }
      setIsDrawerOpen(false);
      setSelectedCompany(null);
    } catch (err) {
      console.error('Error saving company:', err);
      throw err;
    }
  };

  const handleEdit = (company: CompanySettings) => {
    setSelectedCompany(company);
    setIsDrawerOpen(true);
  };

  const handleToggleActive = async (company: CompanySettings) => {
    try {
      await patchCompany(company.id, { is_active: !company.is_active });
    } catch (err) {
      console.error('Error toggling company status:', err);
      alert('Failed to update company status');
    }
  };

  if (isLoading && !companiesData) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchCompanies} />;
  }

  const companies = companiesData?.results || [];
  const totalCount = companiesData?.count || 0;
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Company Settings
              </h2>
              <p className="text-muted-foreground mt-1">
                Manage company/whitelabel settings and configurations
              </p>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <div className="flex flex-wrap gap-4">
                  <span><strong>Note:</strong> Only superadmins can create and manage companies</span>
                </div>
                <div>
                  <strong>Features:</strong> Automatic WhiteLabelAdmin project creation, initial data generation, logo upload support
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedCompany(null);
              setIsDrawerOpen(true);
            }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-colors inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </button>
        </div>
      </div>

      <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search companies by username, email, or project name..."
          />
        </div>
      </div>

      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Project Domain</TableHead>
              <TableHead>Admin Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-12 text-gray-500 dark:text-gray-400" colSpan={8}>
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    {company.project_name}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {company.username}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {company.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <a
                      href={company.project_domain}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6366f1] dark:text-[#6366f1] hover:underline text-sm"
                    >
                      {company.project_domain.length > 30
                        ? `${company.project_domain.substring(0, 30)}...`
                        : company.project_domain}
                    </a>
                  </TableCell>
                  <TableCell>
                    <a
                      href={company.admin_project_domain}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6366f1] dark:text-[#6366f1] hover:underline text-sm"
                    >
                      {company.admin_project_domain.length > 30
                        ? `${company.admin_project_domain.substring(0, 30)}...`
                        : company.admin_project_domain}
                    </a>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(company)}
                      className="focus:outline-none"
                    >
                      <Badge variant={company.is_active ? 'success' : 'danger'}>
                        {company.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    {formatDate(company.created)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(company)}
                        className="text-[#6366f1] dark:text-[#6366f1] hover:text-[#5558e3] dark:hover:text-[#5558e3]"
                      >
                        Edit
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              hasPrevious={currentPage > 1}
              hasNext={currentPage < totalPages}
            />
          </div>
        </div>
      )}

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCompany(null);
        }}
        title={selectedCompany ? 'Edit Company Settings' : 'Add New Company'}
      >
        <CompanySettingsForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setSelectedCompany(null);
          }}
          initialData={selectedCompany || undefined}
        />
      </Drawer>
    </div>
  );
}
