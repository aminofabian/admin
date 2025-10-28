'use client';

import { useEffect, useState } from 'react';
import type { CreateUserRequest, UpdateUserRequest, Staff } from '@/types';
import { LoadingState, ErrorState, EmptyState, StaffForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, Drawer } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';
import { useStaffsStore } from '@/stores/use-staffs-store';

export function StaffsSection() {
  const {
    staffs,
    isLoading,
    error,
    currentPage,
    searchTerm,
    pageSize,
    isCreating,
    operationError,
    fetchStaffs,
    createStaff,
    updateStaff,
    setPage,
    setSearchTerm,
    clearErrors,
  } = useStaffsStore();

  // Local state for UI
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
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
  if (!staffs?.results?.length && !searchTerm) {
    return <EmptyState title="No staff members found" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Staff Members</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all staff accounts and permissions
          </p>
        </div>
        <Button 
          variant="primary" 
          size="md"
          onClick={() => setIsDrawerOpen(true)}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Staff
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <SearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search by username or email..."
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Staff</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{staffs?.count || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {staffs?.results?.filter(s => s.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {staffs?.results?.filter(s => !s.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">This Page</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{staffs?.results?.length || 0}</div>
        </div>
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
              {staffs?.results?.map((staff) => (
                <TableRow key={staff.id}>
                  {/* Username Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold">
                        {staff.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {staff.username}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {staff.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {staff.email}
                      </div>
                      <Badge variant="default" className="text-xs">
                        Email
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant={staff.is_active ? 'success' : 'danger'} className="text-xs">
                        {staff.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                      {staff.is_active && (
                        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span>✓</span>
                          <span>Online</span>
                        </div>
                      )}
                      {!staff.is_active && (
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
                      {staff.role}
                    </Badge>
                  </TableCell>

                  {/* Timestamps */}
                  <TableCell>
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-0.5">Created</div>
                        <div className="text-gray-900 dark:text-gray-100 font-medium">
                          {formatDate(staff.created)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 mb-0.5">Modified</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {formatDate(staff.modified || staff.created)}
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
                        onClick={() => openEditDrawer(staff)}
                        title="Edit staff"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        size="sm"
                        variant={staff.is_active ? 'danger' : 'primary'}
                        onClick={() => handleUpdateStaff(staff.id, { is_active: !staff.is_active })}
                        title={staff.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {staff.is_active ? (
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
      {staffs && staffs.count > pageSize && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
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
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
    </div>
  );
}

