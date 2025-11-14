'use client';

import { useEffect, useState } from 'react';
import type { CreateUserRequest, UpdateUserRequest, Staff } from '@/types';
import { LoadingState, ErrorState, EmptyState, StaffForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, Badge, Button, Drawer, PasswordResetDrawer, useToast } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';
import { useStaffsStore } from '@/stores/use-staffs-store';

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
  if (error) {
    return <ErrorState message={error} onRetry={fetchStaffs} />;
  }

  // Show empty state
  if (!staffs?.results?.length) {
    return <EmptyState title="No staff members found" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a5 5 0 10-10 0v2M5 9h14l1 12H4L5 9zm4 4h6" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground dark:text-white">Staff Members</h2>
              <p className="mt-1 text-sm text-muted-foreground dark:text-slate-400">Manage all staff accounts and permissions</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm hover:bg-primary/90 dark:bg-primary/80 dark:hover:bg-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Staff
          </Button>
        </div>
      </section>

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

      {/* Enhanced Table with All Data */}
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 dark:border-slate-700">
                <TableHead className="min-w-[200px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Username</TableHead>
                <TableHead className="min-w-[200px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Contact</TableHead>
                <TableHead className="min-w-[100px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Status</TableHead>
                <TableHead className="min-w-[100px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Role</TableHead>
                <TableHead className="min-w-[180px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Timestamps</TableHead>
                <TableHead className="min-w-[200px] text-right font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffs?.results?.map(staff => {
                const actionStyles = getStaffActionStyles(staff.is_active);

                return (
                  <TableRow key={staff.id} className="border-border/40 transition-colors hover:bg-slate-50">
                    {/* Username Info */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-primary-foreground">
                          {staff.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{staff.username}</div>
                          <div className="text-xs text-muted-foreground">ID: {staff.id}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="text-sm text-foreground">{staff.email}</div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={staff.is_active ? 'success' : 'danger'} className={actionStyles.statusClass}>
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge variant="info" className="capitalize border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                        {staff.role}
                      </Badge>
                    </TableCell>

                    {/* Timestamps */}
                    <TableCell>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">{formatDate(staff.created)}</span>
                        </div>
                        <div>
                        <span className="font-medium text-foreground">{formatDate(staff.modified || staff.created)}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetPassword(staff)}
                          title="Reset password"
                          className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                          Reset Password
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDrawer(staff)}
                          title="Edit staff"
                          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={staff.is_active ? 'danger' : 'primary'}
                          onClick={() => handleUpdateStaff(staff.id, { is_active: !staff.is_active })}
                          title={actionStyles.toggleLabel}
                          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm ${actionStyles.toggleClass}`}
                        >
                          {actionStyles.icon}
                          {actionStyles.toggleLabel}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Pagination */}
      {staffs && staffs.count > pageSize && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(staffs.count / pageSize)}
            hasNext={!!staffs.next}
            hasPrevious={!!staffs.previous}
            onPageChange={setPage}
          />
        </div>
      )}

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

function getStaffActionStyles(isActive: boolean) {
  if (isActive) {
    return {
      statusClass: 'border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700',
      toggleClass: 'border border-transparent bg-rose-500 text-white hover:bg-rose-600',
      toggleLabel: 'Deactivate',
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v4m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-11V7a4 4 0 00-8 0v5" />
        </svg>
      ),
    };
  }

  return {
    statusClass: 'border border-rose-200 bg-rose-50 px-3 py-1 text-rose-600',
    toggleClass: 'border border-transparent bg-emerald-500 text-white hover:bg-emerald-600',
    toggleLabel: 'Activate',
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v4m0 0a4 4 0 014 4v2H8v-2a4 4 0 014-4zm0 0v12" />
      </svg>
    ),
  };
}

