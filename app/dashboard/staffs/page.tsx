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
} from '@/components/ui';
import { ErrorState, EmptyState, StaffForm, EditProfileDrawer, type EditProfileFormData } from '@/components/features';
import { PasswordResetDrawer, ConfirmModal, Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';
import type { Staff, PaginatedResponse, CreateUserRequest, UpdateUserRequest } from '@/types';

export default function StaffsPage() {
  const [data, setData] = useState<PaginatedResponse<Staff> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, pageSize, setPage } = usePagination();
  const { debouncedSearch } = useSearch();
  const { addToast } = useToast();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editProfileDrawer, setEditProfileDrawer] = useState<{
    isOpen: boolean;
    staff: Staff | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    staff: null,
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


  const handleOpenEditProfile = (staff: Staff) => {
    // Staff type doesn't include full_name or dob, but API may return them
    const staffWithExtendedFields = staff as Staff & { full_name?: string; dob?: string };
    setProfileFormData({
      username: staff.username || '',
      full_name: staffWithExtendedFields.full_name || '',
      dob: staffWithExtendedFields.dob || '',
      email: staff.email || '',
      password: '',
      confirmPassword: '',
      is_active: staff.is_active,
    });
    setEditProfileDrawer({
      isOpen: true,
      staff,
      isLoading: false,
    });
  };

  const [passwordResetModal, setPasswordResetModal] = useState<{
    isOpen: boolean;
    staff: Staff | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    staff: null,
    isLoading: false,
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    staff: Staff | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    staff: null,
    isLoading: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleConfirmPasswordReset = async (password: string, _confirmPassword: string) => {
    if (!passwordResetModal.staff) return;

    // Password matching is already validated by PasswordResetDrawer
    setPasswordResetModal((prev) => ({ ...prev, isLoading: true }));

    try {
      await staffsApi.update(passwordResetModal.staff.id, { password });

      addToast({
        type: 'success',
        title: 'Password reset',
        description: `Password for "${passwordResetModal.staff.username}" has been reset successfully!`,
      });

      setPasswordResetModal({ isOpen: false, staff: null, isLoading: false });
      await loadStaffs();
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

  const handleConfirmToggle = async () => {
    if (!confirmModal.staff) return;

    setConfirmModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const actionPast = confirmModal.staff.is_active ? 'deactivated' : 'activated';
      
      await staffsApi.update(confirmModal.staff.id, { is_active: !confirmModal.staff.is_active });
      
      addToast({
        type: 'success',
        title: 'Staff updated',
        description: `"${confirmModal.staff.username}" has been ${actionPast} successfully!`,
      });
      
      setConfirmModal({ isOpen: false, staff: null, isLoading: false });
      await loadStaffs();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update staff status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage,
      });
      setConfirmModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelToggle = () => {
    setConfirmModal({ isOpen: false, staff: null, isLoading: false });
  };

  const handleUpdateProfile = async () => {
    if (!editProfileDrawer.staff || editProfileDrawer.isLoading) {
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

      await staffsApi.update(editProfileDrawer.staff.id, updatePayload);

      addToast({
        type: 'success',
        title: 'Profile updated successfully',
        description: `"${editProfileDrawer.staff.username}" has been updated successfully!`,
      });

      setEditProfileDrawer({ isOpen: false, staff: null, isLoading: false });
      await loadStaffs();
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
    setEditProfileDrawer({ isOpen: false, staff: null, isLoading: false });
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setSubmitError('');
  };

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

  if (error && !data) return <ErrorState message={error} onRetry={loadStaffs} />;

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header - Compact */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        {successMessage && (
          <div className="px-3 sm:px-4 md:p-6 pt-3 sm:pt-4">
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-800 shadow-sm dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    clipRule="evenodd"
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  />
                </svg>
                <span>{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage('')}
                className="text-green-600 transition-colors hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 touch-manipulation"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {/* Single compact row - everything in one line */}
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            Staffs
          </h2>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
          
          {/* Add button - compact */}
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-md transition-all hover:shadow-lg touch-manipulation px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 shrink-0"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden md:inline ml-1.5">Add Staff</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!data || data.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No Staffs found" 
              description="Get started by creating a new Staff"
            />
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
              {data?.results.map((staff) => (
                <StaffCard
                  key={staff.id}
                  staff={staff}
                  onEdit={handleOpenEditProfile}
                />
              ))}
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
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditProfile(staff)}
                            title="Edit staff"
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
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {data && data.count > pageSize && (
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
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
            hideActions={true}
          />
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
        title="Edit Staff Profile"
        showDob={false}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelToggle}
        onConfirm={handleConfirmToggle}
        title={`${confirmModal.staff?.is_active ? 'Deactivate' : 'Activate'} Staff`}
        description={`Are you sure you want to ${confirmModal.staff?.is_active ? 'deactivate' : 'activate'} "${confirmModal.staff?.username}"? ${
          confirmModal.staff?.is_active
            ? 'They will lose access to the system.'
            : 'They will regain access to the system.'
        }`}
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

// Staff Card Component for Mobile
type StaffCardProps = {
  staff: Staff;
  onEdit: (staff: Staff) => void;
};

function StaffCard({ staff, onEdit }: StaffCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Top Section: Avatar, Name, Status */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
              {staff.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {staff.username}
                </h3>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-0.5">
                  {staff.role ?? 'staff'}
                </p>
              </div>
              <Badge 
                variant={staff.is_active ? 'success' : 'danger'} 
                className="text-[10px] px-2 py-0.5 shrink-0"
              >
                {staff.is_active ? 'Active' : 'Inactive'}
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
            {staff.email}
          </span>
        </div>
      </div>

      {/* Bottom Section: Date & Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(staff.created)}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(staff)}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 touch-manipulation"
          title="Edit staff"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </div>
    </div>
  );
}


