'use client';

import { useEffect, useState } from 'react';
import { useManagersStore } from '@/stores';
import type { Manager, CreateUserRequest, UpdateUserRequest } from '@/types';
import { ErrorState, EmptyState, EditProfileDrawer, type EditProfileFormData } from '@/components/features';
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
  Skeleton,
} from '@/components/ui';

// Icon Components
const UsersIcon = () => (
  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
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
  const [editProfileDrawer, setEditProfileDrawer] = useState<{
    isOpen: boolean;
    manager: Manager | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    manager: null,
    isLoading: false,
  });
  const [profileFormData, setProfileFormData] = useState<EditProfileFormData>({
    username: '',
    full_name: '',
    dob: '',
    email: '',
    password: '',
    confirmPassword: '',
    is_active: true,
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
  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 shrink-0" />
            <div className="flex-1 min-w-0" />
            <Skeleton className="h-9 w-24 sm:w-32 rounded-md shrink-0" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-5 gap-4 px-4 py-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !managers) return <ErrorState message={error} onRetry={fetchManagers} />;

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

  const handleOpenEditProfile = (manager: Manager) => {
    // Manager may have optional full_name and dob fields from API response
    const managerWithOptionalFields = manager as Manager & { full_name?: string; dob?: string };
    setProfileFormData({
      username: manager.username || '',
      full_name: managerWithOptionalFields.full_name || '',
      dob: managerWithOptionalFields.dob || '',
      email: manager.email || '',
      password: '',
      confirmPassword: '',
      is_active: manager.is_active,
    });
    setEditProfileDrawer({
      isOpen: true,
      manager,
      isLoading: false,
    });
  };

  const handleResetPassword = (manager: Manager) => {
    setPasswordResetModal({
      isOpen: true,
      manager,
      isLoading: false,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleConfirmPasswordReset = async (password: string, _confirmPassword: string) => {
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
      await fetchManagers();
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

  const handleUpdateProfile = async () => {
    if (!editProfileDrawer.manager || editProfileDrawer.isLoading) {
      return;
    }

    // Validate passwords match if provided
    if (profileFormData.password && profileFormData.password !== profileFormData.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Password mismatch',
        description: 'Password and Confirm Password must match.',
      });
      return;
    }

    setEditProfileDrawer((prev) => ({ ...prev, isLoading: true }));

    try {
      const updatePayload: UpdateUserRequest = {
        full_name: profileFormData.full_name,
        email: profileFormData.email,
        is_active: profileFormData.is_active,
      };

      if (profileFormData.dob) {
        updatePayload.dob = profileFormData.dob;
      }

      if (profileFormData.password) {
        updatePayload.password = profileFormData.password;
        updatePayload.confirm_password = profileFormData.confirmPassword;
      }

      await updateManager(editProfileDrawer.manager.id, updatePayload);

      addToast({
        type: 'success',
        title: 'Profile updated successfully',
        description: `"${editProfileDrawer.manager.username}" has been updated successfully!`,
      });

      setEditProfileDrawer({ isOpen: false, manager: null, isLoading: false });
      await fetchManagers();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update profile';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage,
      });
      setEditProfileDrawer((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleCloseEditProfile = () => {
    setEditProfileDrawer({ isOpen: false, manager: null, isLoading: false });
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
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

      <TableCell className="text-right">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEditProfile(manager)}
            title="Edit manager"
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderMobileCard = (manager: Manager) => (
    <div key={manager.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Top Section: Avatar, Name, Status */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
              {manager.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {manager.username}
                </h3>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-0.5">
                  {manager.role}
                </p>
              </div>
              <Badge 
                variant={manager.is_active ? 'success' : 'danger'} 
                className="text-[10px] px-2 py-0.5 shrink-0"
              >
                {manager.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Email */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
            {manager.email}
          </span>
        </div>
      </div>

      {/* Bottom Section: Date & Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(manager.created)}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleOpenEditProfile(manager)}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 touch-manipulation"
          title="Edit manager"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header - Compact */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        {/* Single compact row - everything in one line */}
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <UsersIcon />
          </div>
          
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            Managers
          </h2>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
          
          {/* Add button - compact */}
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setIsCreateOpen(true)}
            className="shadow-md transition-all hover:shadow-lg touch-manipulation px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 shrink-0"
          >
            <PlusIcon />
            <span className="hidden md:inline ml-1.5">Add Manager</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!managers || !managers.results?.length ? (
          <div className="py-12">
            <EmptyState 
              title="No Managers found" 
              description="Get started by creating a new Manager"
            />
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
              {managers?.results?.map((manager) => renderMobileCard(manager))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers?.results?.map((manager) => renderTableRow(manager))}
                </TableBody>
              </Table>
            </div>
            
            {managers && managers.count > pageSize && (
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(managers.count / pageSize)}
                  hasNext={!!managers.next}
                  hasPrevious={!!managers.previous}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Drawer */}
      <Drawer 
        isOpen={isCreateOpen} 
        onClose={closeModals} 
        title="Create New Manager" 
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
              Create Manager
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
                <p className="font-medium">Error creating manager</p>
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
                  Manager Account Information
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  All fields marked with * are required. The manager will be able to log in immediately after creation.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <ManagerForm onSubmit={handleCreate} onCancel={closeModals} isLoading={isSubmitting} />
        </div>
      </Drawer>

      {/* Edit Profile Drawer */}
      <EditProfileDrawer
        isOpen={editProfileDrawer.isOpen}
        onClose={handleCloseEditProfile}
        profileFormData={profileFormData}
        setProfileFormData={setProfileFormData}
        isUpdating={editProfileDrawer.isLoading}
        onUpdate={handleUpdateProfile}
        title="Edit Manager Profile"
        showDob={false}
      />

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

