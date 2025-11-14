'use client';

import { useEffect, useState } from 'react';
import { useManagersStore } from '@/stores';
import type { Manager, CreateUserRequest, UpdateUserRequest } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { ManagerForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Badge,
  Button,
  Drawer,
  ConfirmModal,
  PasswordResetDrawer,
  useToast,
  Card,
  CardContent,
} from '@/components/ui';

// Icon Components
const LockIcon = ({ className = 'w-4 h-4 mr-1.5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-4 h-4 mr-1.5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Error Message Component
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
    <span>{message}</span>
  </div>
);

export function ManagersList() {
  const {
    managers,
    isLoading,
    error,
    currentPage,
    pageSize,
    fetchManagers,
    createManager,
    updateManager,
    setPage,
  } = useManagersStore();

  const { addToast } = useToast();

  // Local State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    manager: Manager | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    manager: null,
    isLoading: false,
  });
  const [passwordResetModal, setPasswordResetModal] = useState<{
    isOpen: boolean;
    manager: Manager | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    manager: null,
    isLoading: false,
  });

  // Effects
  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  // Early Returns
  if (isLoading && !managers) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchManagers} />;
  if (!managers?.results?.length) {
    return <EmptyState title="No managers found" />;
  }

  // Event Handlers
  const handleCreate = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      await createManager(formData as CreateUserRequest);

      addToast({
        type: 'success',
        title: 'Manager created',
        description: 'Manager has been created successfully!',
      });
      setIsCreateOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manager';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (manager: Manager) => {
    setConfirmModal({
      isOpen: true,
      manager,
      isLoading: false,
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal.manager) return;

    setConfirmModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const actionPast = confirmModal.manager.is_active ? 'deactivated' : 'activated';

      await updateManager(confirmModal.manager.id, {
        is_active: !confirmModal.manager.is_active,
      });

      addToast({
        type: 'success',
        title: 'Manager updated',
        description: `${confirmModal.manager.username} has been ${actionPast} successfully!`,
      });

      setConfirmModal({ isOpen: false, manager: null, isLoading: false });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update manager status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage,
      });
      setConfirmModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelToggle = () => {
    setConfirmModal({ isOpen: false, manager: null, isLoading: false });
  };

  const handleResetPassword = (manager: Manager) => {
    setPasswordResetModal({
      isOpen: true,
      manager,
      isLoading: false,
    });
  };

  const handleConfirmPasswordReset = async (password: string) => {
    if (!passwordResetModal.manager) return;

    setPasswordResetModal((prev) => ({ ...prev, isLoading: true }));

    try {
      await updateManager(passwordResetModal.manager.id, { password });

      addToast({
        type: 'success',
        title: 'Password reset',
        description: `Password for "${passwordResetModal.manager.username}" has been reset successfully!`,
      });

      setPasswordResetModal({ isOpen: false, manager: null, isLoading: false });
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
    setPasswordResetModal({ isOpen: false, manager: null, isLoading: false });
  };

  const closeModals = () => {
    setIsCreateOpen(false);
    setSubmitError('');
  };

  // Render Functions
  const renderTableRow = (manager: Manager) => (
    <TableRow key={manager.id}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
            {manager.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {manager.username}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{manager.role}</div>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="text-sm text-gray-700 dark:text-gray-300">{manager.email}</div>
      </TableCell>

      <TableCell>
        <Badge variant={manager.is_active ? 'success' : 'danger'}>
          {manager.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>

      <TableCell>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(manager.created)}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleResetPassword(manager)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
            title="Reset password"
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
            variant={manager.is_active ? 'danger' : 'primary'}
            onClick={() => handleToggleStatus(manager)}
            className={
              manager.is_active
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                : 'bg-green-500 hover:bg-green-600 text-white border-green-500'
            }
          >
            {manager.is_active ? (
              <>
                <LockIcon />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircleIcon />
                Activate
              </>
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderMobileCard = (manager: Manager) => (
    <Card key={manager.id} className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
                {manager.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {manager.username}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{manager.role}</div>
              </div>
            </div>
            <Badge variant={manager.is_active ? 'success' : 'danger'}>
              {manager.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</div>
            <div className="text-sm text-gray-900 dark:text-gray-100">{manager.email}</div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created Date</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(manager.created)}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleResetPassword(manager)}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
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
              variant={manager.is_active ? 'danger' : 'primary'}
              onClick={() => handleToggleStatus(manager)}
              className={`w-full ${
                manager.is_active
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                  : 'bg-green-500 hover:bg-green-600 text-white border-green-500'
              }`}
            >
              {manager.is_active ? (
                <>
                  <LockIcon />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircleIcon />
                  Activate
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center rounded-lg shadow-sm">
              <UsersIcon />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Managers
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Manage all manager accounts and permissions
              </p>
            </div>
          </div>
          <Button variant="primary" size="md" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon />
            Add Manager
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
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
              {managers?.results?.map((manager) => renderTableRow(manager))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {managers?.results?.map((manager) => renderMobileCard(manager))}
      </div>

      {/* Pagination */}
      {managers && managers.count > pageSize && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(managers.count / pageSize)}
            hasNext={!!managers.next}
            hasPrevious={!!managers.previous}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Create Drawer */}
      <Drawer isOpen={isCreateOpen} onClose={closeModals} title="Create New Manager" size="lg">
        {submitError && <ErrorMessage message={submitError} />}
        <ManagerForm onSubmit={handleCreate} onCancel={closeModals} isLoading={isSubmitting} />
      </Drawer>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelToggle}
        onConfirm={handleConfirmToggle}
        title={`${confirmModal.manager?.is_active ? 'Deactivate' : 'Activate'} Manager`}
        description={`Are you sure you want to ${
          confirmModal.manager?.is_active ? 'deactivate' : 'activate'
        } "${confirmModal.manager?.username}"? ${
          confirmModal.manager?.is_active
            ? 'They will lose access to the system.'
            : 'They will regain access to the system.'
        }`}
        confirmText={confirmModal.manager?.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmModal.manager?.is_active ? 'warning' : 'info'}
        isLoading={confirmModal.isLoading}
      />

      {/* Password Reset Drawer */}
      <PasswordResetDrawer
        isOpen={passwordResetModal.isOpen}
        onClose={handleCancelPasswordReset}
        onConfirm={handleConfirmPasswordReset}
        username={passwordResetModal.manager?.username}
        isLoading={passwordResetModal.isLoading}
      />
    </div>
  );
}
