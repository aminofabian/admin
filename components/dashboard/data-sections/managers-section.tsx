'use client';

import { useEffect, useState } from 'react';
import { useManagersStore } from '@/stores';
import type { Manager, CreateUserRequest, UpdateUserRequest } from '@/types';
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
    updateManager,
    setPage,
    setSearchTerm,
  } = useManagersStore();

  const [localSearchTerm, setLocalSearchTerm] = useState(storeSearchTerm);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

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
      
      setSuccessMessage('Manager created successfully!');
      setIsCreateDrawerOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manager';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateManager = async (formData: CreateUserRequest | UpdateUserRequest) => {
    if (!selectedManager) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      await updateManager(selectedManager.id, formData as UpdateUserRequest);
      
      setSuccessMessage('Manager updated successfully!');
      setIsEditDrawerOpen(false);
      setSelectedManager(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update manager';
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
      await updateManager(manager.id, { is_active: !manager.is_active });
      setSuccessMessage(`Manager ${manager.is_active ? 'deactivated' : 'activated'} successfully!`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update manager status';
      setSubmitError(errorMessage);
    }
  };

  const openEditDrawer = (manager: Manager) => {
    setSelectedManager(manager);
    setIsEditDrawerOpen(true);
    setSubmitError('');
  };

  const closeDrawers = () => {
    setIsCreateDrawerOpen(false);
    setIsEditDrawerOpen(false);
    setSelectedManager(null);
    setSubmitError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Managers</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all manager accounts and permissions
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsCreateDrawerOpen(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Manager
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300 px-4 py-3 flex items-center justify-between rounded-lg">
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

      {/* Search */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <SearchInput
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          placeholder="Search by username or email..."
        />
      </div>

      {/* Enhanced Table with All Data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Username</TableHead>
                <TableHead className="min-w-[200px]">Contact</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[100px]">Role</TableHead>
                <TableHead className="min-w-[180px]">Timestamps</TableHead>
                <TableHead className="min-w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers?.results?.map((manager) => (
                <TableRow key={manager.id}>
                  {/* Username Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {manager.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {manager.username}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {manager.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {manager.email}
                      </div>
                      <Badge variant="default" className="text-xs">
                        Email
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant={manager.is_active ? 'success' : 'danger'} className="text-xs">
                        {manager.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                      {manager.is_active && (
                        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span>✓</span>
                          <span>Online</span>
                        </div>
                      )}
                      {!manager.is_active && (
                        <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                          <span>⊘</span>
                          <span>Disabled</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <Badge variant="info" className="capitalize">
                      {manager.role}
                    </Badge>
                  </TableCell>

                  {/* Timestamps */}
                  <TableCell>
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-0.5">Created</div>
                        <div className="text-gray-900 dark:text-gray-100 font-medium">
                          {formatDate(manager.created)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-0.5">Modified</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {formatDate(manager.modified)}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditDrawer(manager)}
                        title="Edit manager"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        size="sm"
                        variant={manager.is_active ? 'danger' : 'primary'}
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
        </div>
      </div>

      {/* Pagination */}
      {managers && managers.count > pageSize && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(managers.count / pageSize)}
            hasNext={!!managers.next}
            hasPrevious={!!managers.previous}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Create Manager Drawer */}
      <Drawer
        isOpen={isCreateDrawerOpen}
        onClose={closeDrawers}
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
          onCancel={closeDrawers}
          isLoading={isSubmitting}
        />
      </Drawer>

      {/* Edit Manager Drawer */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={closeDrawers}
        title="Edit Manager"
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
        {selectedManager && (
          <ManagerForm
            manager={selectedManager}
            onSubmit={handleUpdateManager}
            onCancel={closeDrawers}
            isLoading={isSubmitting}
          />
        )}
      </Drawer>
    </div>
  );
}