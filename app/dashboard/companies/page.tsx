'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
// import { companiesApi } from '@/lib/api'; // Suspended for mock data
import { usePagination, useSearch } from '@/lib/hooks';
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Pagination,
  SearchInput,
  Button,
  Modal
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState, CompanyForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import { SuperAdminCompanies } from '@/components/superadmin';
import type { Company, PaginatedResponse, CreateCompanyRequest, UpdateCompanyRequest } from '@/types';

// 🎭 MOCK DATA - Remove when backend is ready
const MOCK_COMPANIES: Company[] = [
  {
    id: 1,
    username: 'gaming_pro',
    email: 'admin@gamingpro.com',
    project_name: 'Gaming Pro Platform',
    project_domain: 'https://gamingpro.com',
    admin_project_domain: 'https://admin.gamingpro.com',
    is_active: true,
    created: '2024-01-15T10:30:00Z',
    modified: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    username: 'casino_king',
    email: 'admin@casinoking.com',
    project_name: 'Casino King',
    project_domain: 'https://casinoking.com',
    admin_project_domain: 'https://admin.casinoking.com',
    is_active: true,
    created: '2024-02-20T14:45:00Z',
    modified: '2024-02-20T14:45:00Z',
  },
  {
    id: 3,
    username: 'slots_master',
    email: 'admin@slotsmaster.io',
    project_name: 'Slots Master',
    project_domain: 'https://slotsmaster.io',
    admin_project_domain: 'https://admin.slotsmaster.io',
    is_active: false,
    created: '2024-03-10T09:15:00Z',
    modified: '2024-03-10T09:15:00Z',
  },
  {
    id: 4,
    username: 'bet_zone',
    email: 'admin@betzone.net',
    project_name: 'Bet Zone',
    project_domain: 'https://betzone.net',
    admin_project_domain: 'https://admin.betzone.net',
    is_active: true,
    created: '2024-04-05T16:20:00Z',
    modified: '2024-04-05T16:20:00Z',
  },
  {
    id: 5,
    username: 'lucky_spin',
    email: 'admin@luckyspin.com',
    project_name: 'Lucky Spin Casino',
    project_domain: 'https://luckyspin.com',
    admin_project_domain: 'https://admin.luckyspin.com',
    is_active: true,
    created: '2024-05-12T11:30:00Z',
    modified: '2024-05-12T11:30:00Z',
  },
  {
    id: 6,
    username: 'mega_wins',
    email: 'admin@megawins.io',
    project_name: 'Mega Wins',
    project_domain: 'https://megawins.io',
    admin_project_domain: 'https://admin.megawins.io',
    is_active: false,
    created: '2024-06-18T13:45:00Z',
    modified: '2024-06-18T13:45:00Z',
  },
  {
    id: 7,
    username: 'jackpot_city',
    email: 'admin@jackpotcity.com',
    project_name: 'Jackpot City',
    project_domain: 'https://jackpotcity.com',
    admin_project_domain: 'https://admin.jackpotcity.com',
    is_active: true,
    created: '2024-07-22T08:00:00Z',
    modified: '2024-07-22T08:00:00Z',
  },
  {
    id: 8,
    username: 'royal_casino',
    email: 'admin@royalcasino.net',
    project_name: 'Royal Casino',
    project_domain: 'https://royalcasino.net',
    admin_project_domain: 'https://admin.royalcasino.net',
    is_active: true,
    created: '2024-08-30T15:10:00Z',
    modified: '2024-08-30T15:10:00Z',
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
const mockCompaniesApi = {
  list: async (filters?: { search?: string; page?: number; page_size?: number }): Promise<PaginatedResponse<Company>> => {
    await delay(800); // Simulate network delay

    let filteredCompanies = [...MOCK_COMPANIES];

    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredCompanies = filteredCompanies.filter(
        (company) =>
          company.username.toLowerCase().includes(searchLower) ||
          company.email.toLowerCase().includes(searchLower) ||
          company.project_name.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

    return {
      count: filteredCompanies.length,
      next: endIndex < filteredCompanies.length ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: paginatedCompanies,
    };
  },

  create: async (data: CreateCompanyRequest): Promise<{ status: string; message: string; data: Company }> => {
    await delay(1000); // Simulate network delay

    const newCompany: Company = {
      id: MOCK_COMPANIES.length + 1,
      username: data.username,
      email: data.email,
      project_name: data.project_name,
      project_domain: data.project_domain,
      admin_project_domain: data.admin_project_domain,
      is_active: true,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    MOCK_COMPANIES.unshift(newCompany); // Add to beginning of array

    return {
      status: 'success',
      message: 'Company created successfully',
      data: newCompany,
    };
  },

  partialUpdate: async (id: number, data: Partial<UpdateCompanyRequest>): Promise<{ status: string; message: string; data: Company }> => {
    await delay(800); // Simulate network delay

    const companyIndex = MOCK_COMPANIES.findIndex((c) => c.id === id);
    if (companyIndex === -1) {
      throw new Error('Company not found');
    }

    MOCK_COMPANIES[companyIndex] = {
      ...MOCK_COMPANIES[companyIndex],
      ...data,
      modified: new Date().toISOString(),
    };

    return {
      status: 'success',
      message: 'Company updated successfully',
      data: MOCK_COMPANIES[companyIndex],
    };
  },
};

export default function CompaniesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<Company> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      setError('');
      // Using mock API - replace with companiesApi.list when backend is ready
      const response = await mockCompaniesApi.list({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // If user is superadmin, render superadmin companies view
  if (user?.role === 'superadmin') {
    return <SuperAdminCompanies />;
  }

  const handleCreateCompany = async (formData: CreateCompanyRequest | UpdateCompanyRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      // Using mock API - replace with companiesApi.create when backend is ready
      await mockCompaniesApi.create(formData as CreateCompanyRequest);

      setSuccessMessage('Company created successfully!');
      setIsCreateModalOpen(false);
      await loadCompanies();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create company';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async (formData: CreateCompanyRequest | UpdateCompanyRequest) => {
    if (!selectedCompany) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');

      // Using mock API - replace with companiesApi.partialUpdate when backend is ready
      await mockCompaniesApi.partialUpdate(selectedCompany.id, formData as UpdateCompanyRequest);

      setSuccessMessage('Company updated successfully!');
      setIsEditModalOpen(false);
      setSelectedCompany(null);
      await loadCompanies();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update company';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (company: Company) => {
    if (!confirm(`Are you sure you want to ${company.is_active ? 'deactivate' : 'activate'} ${company.project_name}?`)) {
      return;
    }

    try {
      // Using mock API - replace with companiesApi.partialUpdate when backend is ready
      await mockCompaniesApi.partialUpdate(company.id, { is_active: !company.is_active });
      setSuccessMessage(`Company ${company.is_active ? 'deactivated' : 'activated'} successfully!`);
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company status');
    }
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setIsEditModalOpen(true);
    setSubmitError('');
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedCompany(null);
    setSubmitError('');
  };

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={loadCompanies} />;
  }

  return (
    <div>
      {/* Mock Data Banner */}
      <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 px-4 py-3 flex items-center gap-2 rounded-lg">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span><strong>Development Mode:</strong> Using mock data. Changes persist in memory only (refresh to reset).</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Companies</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Company
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300 px-4 py-3 flex items-center justify-between rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Companies</h2>
            <div className="w-64">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <EmptyState
              title="No companies found"
              description="Get started by creating a new company"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.username}</TableCell>
                      <TableCell>{company.email}</TableCell>
                      <TableCell>{company.project_name}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={company.project_domain}>
                        {company.project_domain}
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.is_active ? 'success' : 'danger'}>
                          {company.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(company.created)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(company)}
                            title="Edit company"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            size="sm"
                            variant={company.is_active ? 'danger' : 'secondary'}
                            onClick={() => handleToggleStatus(company)}
                            title={company.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {company.is_active ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </Button>
                        </div>
                      </TableCell>
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

      {/* Create Company Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Company"
        size="xl"
      >
        {submitError && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
            {submitError}
          </div>
        )}
        <CompanyForm
          onSubmit={handleCreateCompany as (data: CreateCompanyRequest | UpdateCompanyRequest) => Promise<void>}
          onCancel={closeModals}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Company"
        size="xl"
      >
        {submitError && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
            {submitError}
          </div>
        )}
        {selectedCompany && (
          <CompanyForm
            company={selectedCompany}
            onSubmit={handleUpdateCompany as (data: CreateCompanyRequest | UpdateCompanyRequest) => Promise<void>}
            onCancel={closeModals}
            isLoading={isSubmitting}
          />
        )}
      </Modal>
    </div>
  );
}

