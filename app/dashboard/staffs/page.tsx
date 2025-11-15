'use client';

import { useState, useEffect } from 'react';
import { staffsApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  Badge, 
  Pagination, 
  Button,
  Drawer,
  useToast,
  ConfirmModal,
  PasswordResetDrawer
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState, StaffForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Staff, PaginatedResponse, CreateUserRequest, UpdateUserRequest } from '@/types';

export default function StaffsPage() {
  const [data, setData] = useState<PaginatedResponse<Staff> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();
  const { addToast } = useToast();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    staff: Staff | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    staff: null,
    isLoading: false,
  });
  const [passwordResetModal, setPasswordResetModal] = useState<{
    isOpen: boolean;
    staff: Staff | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    staff: null,
    isLoading: false,
  });

  useEffect(() => {
    loadStaffs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadStaffs = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await staffsApi.list({
        page, page_size: pageSize, search: debouncedSearch || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staffs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStaff = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      await staffsApi.create(formData as CreateUserRequest);

      setSuccessMessage('Staff created successfully!');
      setIsCreateModalOpen(false);
      await loadStaffs(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create staff';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: Staff) => {
    setConfirmModal({
      isOpen: true,
      staff,
      isLoading: false,
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal.staff) return;

    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      const actionPast = confirmModal.staff.is_active ? 'deactivated' : 'activated';
      
      await staffsApi.update(confirmModal.staff.id, { is_active: !confirmModal.staff.is_active });
      
      addToast({
        type: 'success',
        title: 'Staff updated',
        description: `"${confirmModal.staff.username}" has been ${actionPast} successfully!`,
      });
      
      setConfirmModal({ isOpen: false, staff: null, isLoading: false });
      await loadStaffs(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update staff status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage,
      });
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelToggle = () => {
    setConfirmModal({ isOpen: false, staff: null, isLoading: false });
  };

  const handleResetPassword = (staff: Staff) => {
    setPasswordResetModal({
      isOpen: true,
      staff,
      isLoading: false,
    });
  };

  const handleConfirmPasswordReset = async (password: string) => {
    if (!passwordResetModal.staff) return;

    setPasswordResetModal((prev) => ({ ...prev, isLoading: true }));

    try {
      await staffsApi.update(passwordResetModal.staff.id, { password });

      addToast({
        type: 'success',
        title: 'Password reset',
        description: `Password for "${passwordResetModal.staff.username}" has been reset successfully!`,
      });

      setPasswordResetModal({ isOpen: false, staff: null, isLoading: false });
      await loadStaffs(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset password';
      addToast({
        type: 'error',
        title: 'Reset failed',
        description: errorMessage,
      });
      setPasswordResetModal((prev) => ({ ...prev, isLoading: false }));
      throw err;
    }
  };

  const handleCancelPasswordReset = () => {
    setPasswordResetModal({ isOpen: false, staff: null, isLoading: false });
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setSubmitError('');
  };

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={loadStaffs} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center rounded-lg shadow-sm">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Staffs</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Manage all Staff accounts and permissions
              </p>
            </div>
          </div>
          <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Staff
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800 shadow-sm dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                clipRule="evenodd"
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              />
            </svg>
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-green-600 transition-colors hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          {data?.results.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                title="No Staffs found" 
                description="Get started by creating a new Staff"
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
                            {staff.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {staff.username}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{staff.role ?? 'staff'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 dark:text-gray-300">{staff.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={staff.is_active ? 'success' : 'danger'}>
                          {staff.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(staff.created)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetPassword(staff)}
                            title="Reset password"
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                              />
                            </svg>
                            Reset Password
                          </Button>
                          <Button
                            size="sm"
                            variant={staff.is_active ? 'danger' : 'secondary'}
                            onClick={() => handleToggleStatus(staff)}
                            title={staff.is_active ? 'Deactivate' : 'Activate'}
                            className="font-semibold uppercase tracking-wide"
                          >
                            {staff.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data && data.count > pageSize && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(data.count / pageSize)}
                    onPageChange={setPage}
                    hasNext={!!data.next}
                    hasPrevious={!!data.previous}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Staff Drawer */}
      <Drawer 
        isOpen={isCreateModalOpen} 
        onClose={closeModals} 
        title="Create New Staff" 
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModals}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-manager-form"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Staff
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Error Alert */}
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Error creating staff</p>
                <p className="text-sm mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Staff Account Information
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  All fields marked with * are required. The staff will be able to log in immediately after creation.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <StaffForm
            onSubmit={handleCreateStaff as (data: CreateUserRequest | UpdateUserRequest) => Promise<void>}
            onCancel={closeModals}
            isLoading={isSubmitting}
          />
        </div>
      </Drawer>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelToggle}
        onConfirm={handleConfirmToggle}
        title={`${confirmModal.staff?.is_active ? 'Deactivate' : 'Activate'} Manager`}
        description={`Are you sure you want to ${confirmModal.staff?.is_active ? 'deactivate' : 'activate'} "${confirmModal.staff?.username}"?`}
        confirmText={confirmModal.staff?.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmModal.staff?.is_active ? 'warning' : 'info'}
        isLoading={confirmModal.isLoading}
      />

      {/* Password Reset Drawer */}
      <PasswordResetDrawer
        isOpen={passwordResetModal.isOpen}
        onClose={handleCancelPasswordReset}
        onConfirm={handleConfirmPasswordReset}
        username={passwordResetModal.staff?.username}
        isLoading={passwordResetModal.isLoading}
      />
    </div>
  );
}

