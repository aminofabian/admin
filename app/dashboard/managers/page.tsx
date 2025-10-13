'use client';

import { useState, useEffect } from 'react';
// import { managersApi } from '@/lib/api'; // Suspended for mock data
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
import { LoadingState, ErrorState, EmptyState, ManagerForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Manager, PaginatedResponse, CreateUserRequest, UpdateUserRequest } from '@/types';

// 🎭 MOCK DATA - Remove when backend is ready
const MOCK_MANAGERS: Manager[] = [
  {
    id: 1,
    username: 'manager_john',
    email: 'john@gaming.com',
    role: 'manager',
    is_active: true,
    project_id: 1,
    created: '2024-01-15T10:30:00Z',
    modified: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    username: 'manager_sarah',
    email: 'sarah@casino.com',
    role: 'manager',
    is_active: true,
    project_id: 2,
    created: '2024-02-20T14:45:00Z',
    modified: '2024-02-20T14:45:00Z',
  },
  {
    id: 3,
    username: 'manager_mike',
    email: 'mike@slots.io',
    role: 'manager',
    is_active: false,
    project_id: 3,
    created: '2024-03-10T09:15:00Z',
    modified: '2024-03-10T09:15:00Z',
  },
  {
    id: 4,
    username: 'manager_lisa',
    email: 'lisa@betzone.net',
    role: 'manager',
    is_active: true,
    project_id: 4,
    created: '2024-04-05T16:20:00Z',
    modified: '2024-04-05T16:20:00Z',
  },
  {
    id: 5,
    username: 'manager_alex',
    email: 'alex@luckyspin.com',
    role: 'manager',
    is_active: true,
    project_id: 5,
    created: '2024-05-12T11:30:00Z',
    modified: '2024-05-12T11:30:00Z',
  },
  {
    id: 6,
    username: 'manager_emma',
    email: 'emma@megawins.io',
    role: 'manager',
    is_active: false,
    project_id: 6,
    created: '2024-06-18T13:45:00Z',
    modified: '2024-06-18T13:45:00Z',
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
const mockManagersApi = {
  list: async (filters?: { search?: string; page?: number; page_size?: number }): Promise<PaginatedResponse<Manager>> => {
    await delay(800); // Simulate network delay

    let filteredManagers = [...MOCK_MANAGERS];

    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredManagers = filteredManagers.filter(
        (manager) =>
          manager.username.toLowerCase().includes(searchLower) ||
          manager.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedManagers = filteredManagers.slice(startIndex, endIndex);

    return {
      count: filteredManagers.length,
      next: endIndex < filteredManagers.length ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: paginatedManagers,
    };
  },

  create: async (data: CreateUserRequest): Promise<Manager> => {
    await delay(1000); // Simulate network delay

    const newManager: Manager = {
      id: MOCK_MANAGERS.length + 1,
      username: data.username,
      email: data.email,
      role: 'manager',
      is_active: true,
      project_id: 1, // Default project
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    MOCK_MANAGERS.unshift(newManager); // Add to beginning of array

    return newManager;
  },

  update: async (id: number, data: Partial<UpdateUserRequest>): Promise<Manager> => {
    await delay(800); // Simulate network delay

    const managerIndex = MOCK_MANAGERS.findIndex((m) => m.id === id);
    if (managerIndex === -1) {
      throw new Error('Manager not found');
    }

    MOCK_MANAGERS[managerIndex] = {
      ...MOCK_MANAGERS[managerIndex],
      ...data,
      modified: new Date().toISOString(),
    };

    return MOCK_MANAGERS[managerIndex];
  },
};

export default function ManagersPage() {
  const [data, setData] = useState<PaginatedResponse<Manager> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();

  useEffect(() => {
    loadManagers();
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadManagers = async () => {
    try {
      setIsLoading(true);
      setError('');
      // Using mock API - replace with managersApi.list when backend is ready
      const response = await mockManagersApi.list({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load managers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateManager = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      // Using mock API - replace with managersApi.create when backend is ready
      await mockManagersApi.create(formData as CreateUserRequest);

      setSuccessMessage('Manager created successfully!');
      setIsCreateModalOpen(false);
      await loadManagers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manager';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (manager: Manager) => {
    if (!confirm(`Are you sure you want to ${manager.is_active ? 'deactivate' : 'activate'} ${manager.username}?`)) {
      return;
    }

    try {
      // Using mock API - replace with managersApi.update when backend is ready
      await mockManagersApi.update(manager.id, { is_active: !manager.is_active });
      setSuccessMessage(`Manager ${manager.is_active ? 'deactivated' : 'activated'} successfully!`);
      await loadManagers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update manager status');
    }
  };

  const openViewModal = (manager: Manager) => {
    setSelectedManager(manager);
    setIsViewModalOpen(true);
    setSubmitError('');
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedManager(null);
    setSubmitError('');
  };

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={loadManagers} />;
  }

  return (
    <div>
      {/* Mock Data Banner */}
      <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span><strong>Development Mode:</strong> Using mock data. Changes persist in memory only (refresh to reset).</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Managers</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Manager
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Managers</h2>
            <div className="w-64">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search managers..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <EmptyState 
              title="No managers found" 
              description="Get started by creating a new manager"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Project ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">{manager.username}</TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>{manager.project_id}</TableCell>
                      <TableCell>
                        <Badge variant={manager.is_active ? 'success' : 'danger'}>
                          {manager.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(manager.created)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openViewModal(manager)}
                            title="View details"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                          <Button
                            size="sm"
                            variant={manager.is_active ? 'danger' : 'secondary'}
                            onClick={() => handleToggleStatus(manager)}
                            title={manager.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {manager.is_active ? (
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

      {/* Create Manager Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Manager"
        size="md"
      >
        {submitError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3">
            {submitError}
          </div>
        )}
        <ManagerForm
          onSubmit={handleCreateManager as (data: CreateUserRequest | UpdateUserRequest) => Promise<void>}
          onCancel={closeModals}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* View Manager Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={closeModals}
        title="Manager Details"
        size="md"
      >
        {selectedManager && (
          <ManagerForm
            manager={selectedManager}
            onSubmit={async () => {}} // Read-only view
            onCancel={closeModals}
            isLoading={false}
          />
        )}
      </Modal>
    </div>
  );
}
