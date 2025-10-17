'use client';

import { useEffect, useState } from 'react';
import { useManagersStore } from '@/stores';
import type { CreateUserRequest, UpdateUserRequest } from '@/types';
import { LoadingState, ErrorState, EmptyState, ManagerForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, Drawer } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';

export function ManagersSection() {
  const {
    managers,
    isLoading,
    error,
    currentPage,
    pageSize,
    searchTerm: storeSearchTerm,
    fetchManagers,
    createManager,
    setPage,
    setSearchTerm,
  } = useManagersStore();

  const [localSearchTerm, setLocalSearchTerm] = useState(storeSearchTerm);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== storeSearchTerm) {
        setSearchTerm(localSearchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm, storeSearchTerm, setSearchTerm]);

  if (isLoading && !managers) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchManagers} />;
  if (!managers?.results?.length && !storeSearchTerm) {
    return <EmptyState title="No managers found" />;
  }

  const handleCreateManager = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      await createManager(formData as CreateUserRequest);
      
      setIsDrawerOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manager';
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Managers</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all manager accounts and permissions
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsDrawerOpen(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Manager
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          placeholder="Search by username or email..."
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Managers</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{managers?.count || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {managers?.results?.filter(m => m.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {managers?.results?.filter(m => !m.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">This Page</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{managers?.results?.length || 0}</div>
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
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managers?.results?.map((manager) => (
              <TableRow key={manager.id}>
                <TableCell>{manager.id}</TableCell>
                <TableCell className="font-medium">{manager.username}</TableCell>
                <TableCell>{manager.email}</TableCell>
                <TableCell>
                  <Badge variant="info">{manager.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={manager.is_active ? 'success' : 'danger'}>
                    {manager.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">
                  {formatDate(manager.created)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {managers && managers.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(managers.count / pageSize)}
          hasNext={!!managers.next}
          hasPrevious={!!managers.previous}
          onPageChange={setPage}
        />
      )}

      {/* Add Manager Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Create New Manager"
        size="lg"
      >
        {submitError && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{submitError}</span>
          </div>
        )}
        <ManagerForm
          onSubmit={handleCreateManager}
          onCancel={handleCloseDrawer}
          isLoading={isSubmitting}
        />
      </Drawer>
    </div>
  );
}

