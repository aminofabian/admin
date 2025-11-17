'use client';

import { useEffect, useState } from 'react';
import { useManagersStore } from '@/stores';
import type { Manager, CreateUserRequest, UpdateUserRequest } from '@/types';
import { LoadingState, ErrorState, EmptyState, EditProfileDrawer, type EditProfileFormData } from '@/components/features';
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
  const [actionsDrawer, setActionsDrawer] = useState<{
    isOpen: boolean;
    manager: Manager | null;
  }>({
    isOpen: false,
    manager: null,
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
    handleCloseActions();
  };

  const handleResetPassword = (manager: Manager) => {
    setPasswordResetModal({
      isOpen: true,
      manager,
      isLoading: false,
    });
    handleCloseActions();
  };

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
    handleCloseActions();
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

  const handleOpenActions = (manager: Manager) => {
    setActionsDrawer({
      isOpen: true,
      manager,
    });
  };

  const handleCloseActions = () => {
    setActionsDrawer({
      isOpen: false,
      manager: null,
    });
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
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenActions(manager)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            title="Actions"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
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

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleOpenActions(manager)}
              className="w-full flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              Actions
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

      {/* Actions Drawer */}
      <ManagerActionsDrawer
        isOpen={actionsDrawer.isOpen}
        manager={actionsDrawer.manager}
        onClose={handleCloseActions}
        onEditProfile={() => actionsDrawer.manager && handleOpenEditProfile(actionsDrawer.manager)}
      />
    </div>
  );
}

// Manager Actions Drawer Component
type ManagerActionsDrawerProps = {
  isOpen: boolean;
  manager: Manager | null;
  onClose: () => void;
  onEditProfile: () => void;
};

function ManagerActionsDrawer({
  isOpen,
  manager,
  onClose,
  onEditProfile,
}: ManagerActionsDrawerProps) {
  if (!manager) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Actions for ${manager.username}`} size="sm">
      <div className="space-y-3">
        <Button
          variant="ghost"
          onClick={onEditProfile}
          className="w-full justify-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span>Edit Profile</span>
        </Button>
      </div>
    </Drawer>
  );
}
