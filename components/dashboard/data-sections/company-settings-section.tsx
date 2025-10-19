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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Company Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage company/whitelabel settings and configurations
          </p>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex flex-wrap gap-4">
              <span><strong>Note:</strong> Only superadmins can create and manage companies</span>
            </div>
            <div>
              <strong>Features:</strong> Automatic WhiteLabelAdmin project creation, initial data generation, logo upload support
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedCompany(null);
            setIsDrawerOpen(true);
          }}
          className="px-4 py-2 bg-[#6366f1] hover:bg-[#5558e3] text-white rounded-lg transition-colors inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Company
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search companies by username, email, or project name..."
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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

      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            hasPrevious={currentPage > 1}
            hasNext={currentPage < totalPages}
          />
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
