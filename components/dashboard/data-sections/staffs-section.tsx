'use client';

import { useEffect, useState } from 'react';
import type { CreateUserRequest, UpdateUserRequest, Staff } from '@/types';
import { LoadingState, ErrorState, EmptyState, StaffForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, Badge, Button, Drawer, PasswordResetDrawer, useToast } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { useStaffsStore } from '@/stores/use-staffs-store';

// Format amount for display (read-only)
const formatAmount = (amount: string | number | null | undefined): string => {
  if (!amount) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  return formatCurrency(String(num));
};

export function StaffsSection() {
  const {
    staffs,
    isLoading,
    error,
    currentPage,
    pageSize,
    isCreating,
    operationError,
    fetchStaffs,
    createStaff,
    updateStaff,
    setPage,
    clearErrors,
  } = useStaffsStore();

  const { addToast } = useToast();

  // Local state for UI
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [passwordResetModal, setPasswordResetModal] = useState<{
    isOpen: boolean;
    staff: Staff | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    staff: null,
    isLoading: false,
  });

  // Initialize data on component mount
  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  const handleCreateStaff = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      await createStaff(formData as CreateUserRequest);
      closeDrawers();
    } catch (error) {
      console.error('Error creating staff:', error);
    }
  };

  const handleUpdateStaff = async (id: number, data: UpdateUserRequest) => {
    try {
      await updateStaff(id, data);
      if (selectedStaff) {
        closeDrawers();
      }
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const openEditDrawer = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsEditDrawerOpen(true);
  };

  const closeDrawers = () => {
    setIsDrawerOpen(false);
    setIsEditDrawerOpen(false);
    setSelectedStaff(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      await updateStaff(passwordResetModal.staff.id, { password });

      addToast({
        type: 'success',
        title: 'Password reset',
        description: `Password for "${passwordResetModal.staff.username}" has been reset successfully!`,
      });

      setPasswordResetModal({ isOpen: false, staff: null, isLoading: false });
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

  // Show loading state
  if (isLoading && !staffs) {
    return <LoadingState />;
  }

  // Show error state
  if (error && !staffs) {
    return <ErrorState message={error} onRetry={fetchStaffs} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a5 5 0 10-10 0v2M5 9h14l1 12H4L5 9zm4 4h6" />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            Staff Members
          </h2>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
          
          {/* Add Staff Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            className="shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Staff
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className="text-sm text-muted-foreground dark:text-slate-400">Total Staff</div>
          <div className="mt-1 text-2xl font-semibold text-foreground dark:text-white">{staffs?.count || 0}</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className="text-sm text-muted-foreground dark:text-slate-400">Active</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{staffs?.results?.filter(s => s.is_active).length || 0}</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className="text-sm text-muted-foreground dark:text-slate-400">Inactive</div>
          <div className="mt-1 text-2xl font-semibold text-rose-600 dark:text-rose-400">{staffs?.results?.filter(s => !s.is_active).length || 0}</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className="text-sm text-muted-foreground dark:text-slate-400">This Page</div>
          <div className="mt-1 text-2xl font-semibold text-foreground dark:text-white">{staffs?.results?.length || 0}</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!staffs?.results?.length ? (
          <div className="py-12">
            <EmptyState title="No staff members found" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffs.results.map(staff => {
                    return (
                      <TableRow key={staff.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {/* Username Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
                              {staff.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{staff.username}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">ID: {staff.id}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{staff.email}</div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={staff.is_active ? 'success' : 'danger'}>
                            {staff.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <Badge variant="info" className="capitalize">
                            {staff.role}
                          </Badge>
                        </TableCell>

                        {/* Min Amount (Read-only) */}
                        <TableCell>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {formatAmount(staff.min_amount)}
                          </div>
                        </TableCell>

                        {/* Max Amount (Read-only) */}
                        <TableCell>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {formatAmount(staff.max_amount)}
                          </div>
                        </TableCell>

                        {/* Timestamps */}
                        <TableCell>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div>{formatDate(staff.created)}</div>
                            <div>{formatDate(staff.modified || staff.created)}</div>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDrawer(staff)}
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {staffs.count > pageSize && (
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(staffs.count / pageSize)}
                  hasNext={!!staffs.next}
                  hasPrevious={!!staffs.previous}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Staff Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Create New Staff"
        size="lg"
      >
        {operationError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{operationError}</span>
          </div>
        )}
        <StaffForm
          onSubmit={handleCreateStaff}
          onCancel={closeDrawers}
          isLoading={isCreating}
        />
      </Drawer>

      {/* Edit Staff Drawer */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={closeDrawers}
        title="Edit Staff"
        size="lg"
      >
        {operationError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{operationError}</span>
          </div>
        )}
        {selectedStaff && (
          <StaffForm
            staff={selectedStaff}
            onSubmit={(formData) => handleUpdateStaff(selectedStaff.id, formData as UpdateUserRequest)}
            onCancel={closeDrawers}
            isLoading={isCreating}
          />
        )}
      </Drawer>

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

