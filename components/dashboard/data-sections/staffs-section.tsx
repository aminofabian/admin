'use client';

import { useEffect, useState } from 'react';
import type { CreateUserRequest, UpdateUserRequest } from '@/types';
import { LoadingState, ErrorState, EmptyState, StaffForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, Drawer } from '@/components/ui';
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
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error creating staff:', error);
    }
  };

  const handleUpdateStaff = async (id: number, data: UpdateUserRequest) => {
    try {
      await updateStaff(id, data);
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search by username, email, or mobile..."
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffs?.results?.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>{staff.id}</TableCell>
                <TableCell className="font-medium">{staff.username}</TableCell>
                <TableCell>{staff.email}</TableCell>
                <TableCell>{staff.mobile_number || '-'}</TableCell>
                <TableCell>
                  <Badge variant="info">{staff.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={staff.is_active ? 'success' : 'danger'}>
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">
                  {formatDate(staff.created)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdateStaff(staff.id, { is_active: !staff.is_active })}
                    >
                      {staff.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {staffs && staffs.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(staffs.count / pageSize)}
          hasNext={!!staffs.next}
          hasPrevious={!!staffs.previous}
          onPageChange={setPage}
        />
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
          onCancel={handleCloseDrawer}
          isLoading={isCreating}
        />
      </Drawer>
    </div>
  );
}

