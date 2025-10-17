'use client';

import { useEffect } from 'react';
import { useManagersStore } from '@/stores';
import { useSearch } from '@/lib/hooks';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  Badge, 
  Pagination, 
  SearchInput, 
  Button,
  Modal
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState, ManagerForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Manager, CreateUserRequest, UpdateUserRequest } from '@/types';
import { useState } from 'react';

export default function ManagersPage() {
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
    setSearchTerm,
  } = useManagersStore();

  const { search, debouncedSearch, setSearch } = useSearch();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Initial load
  useEffect(() => {
    fetchManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle debounced search
  useEffect(() => {
    if (debouncedSearch !== undefined) {
      setSearchTerm(debouncedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCreateManager = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      await createManager(formData as CreateUserRequest);

      setSuccessMessage('Manager created successfully!');
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manager';
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update manager status';
      setSubmitError(errorMessage);
    }
  };

  const openViewModal = (manager: Manager) => {
    setSelectedManager(manager);
    setIsViewModalOpen(true);
    setSubmitError('');
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedManager(null);
    setSubmitError('');
  };

  // Calculate comprehensive stats
  const activeCount = managers?.results?.filter(m => m.is_active).length || 0;
  const inactiveCount = managers?.results?.filter(m => !m.is_active).length || 0;
  const recentManagers = managers?.results?.filter(m => {
    const createdDate = new Date(m.created);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length || 0;
  
  // Project distribution
  const projectCounts = managers?.results?.reduce((acc, m) => {
    acc[m.project_id] = (acc[m.project_id] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};
  
  const uniqueProjects = Object.keys(projectCounts).length;

  if (isLoading && !managers) {
    return <LoadingState />;
  }

  if (error && !managers) {
    return <ErrorState message={error} onRetry={fetchManagers} />;
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Managers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage platform managers and their permissions • Total: {managers?.count.toLocaleString() || 0}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
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
      <div className="w-full max-w-xl">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
        />
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-2">Total Managers</div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {managers?.count.toLocaleString() || 0}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Showing {managers?.results?.length || 0} on this page
                </div>
              </div>
              <div className="text-3xl opacity-20">👨‍💼</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-green-700 dark:text-green-400 font-medium mb-2">Active Managers</div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {activeCount}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                  {managers?.results?.length ? ((activeCount / managers.results.length) * 100).toFixed(0) : 0}% active
                </div>
              </div>
              <div className="text-3xl opacity-20">✓</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-red-700 dark:text-red-400 font-medium mb-2">Inactive Managers</div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {inactiveCount}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Requires attention
                </div>
              </div>
              <div className="text-3xl opacity-20">⊘</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-purple-700 dark:text-purple-400 font-medium mb-2">Recent (30d)</div>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {recentManagers}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                  New this month
                </div>
              </div>
              <div className="text-3xl opacity-20">📅</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Projects</div>
            <div className="text-2xl font-bold text-foreground">{uniqueProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Avg per Project</div>
            <div className="text-2xl font-bold text-foreground">
              {uniqueProjects > 0 ? ((managers?.results?.length || 0) / uniqueProjects).toFixed(1) : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Status</div>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-xs">{activeCount} Active</Badge>
              <Badge variant="danger" className="text-xs">{inactiveCount} Inactive</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Page Results</div>
            <div className="text-2xl font-bold text-foreground">{managers?.results?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Distribution */}
      {uniqueProjects > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-semibold text-foreground mb-3">
              Managers by Project ({uniqueProjects} projects)
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(projectCounts).map(([projectId, count]) => (
                <div 
                  key={projectId}
                  className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border"
                >
                  <span className="text-sm font-medium text-foreground">Project #{projectId}</span>
                  <Badge variant="info" className="text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Table */}
      <Card>
        <CardHeader className="border-b bg-muted/50">
          <div>
            <h2 className="text-lg font-semibold">Manager Details</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Comprehensive manager information with quick actions
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {managers?.results.length === 0 ? (
            <EmptyState 
              title="No managers found" 
              description="Get started by creating a new manager"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Manager Info</TableHead>
                      <TableHead className="min-w-[150px]">Contact</TableHead>
                      <TableHead className="min-w-[120px]">Project</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Role</TableHead>
                      <TableHead className="min-w-[180px]">Timestamps</TableHead>
                      <TableHead className="min-w-[150px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managers?.results.map((manager) => (
                      <TableRow key={manager.id}>
                        {/* Manager Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                              {manager.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {manager.username}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {manager.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm text-foreground">
                              {manager.email}
                            </div>
                            <Badge variant="default" className="text-xs">
                              Email
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Project */}
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="info" className="text-sm">
                              Project #{manager.project_id}
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
                              <div className="text-muted-foreground mb-0.5">Created</div>
                              <div className="text-foreground font-medium">
                                {formatDate(manager.created)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-0.5">Modified</div>
                              <div className="text-muted-foreground">
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
                              variant="ghost"
                              onClick={() => openViewModal(manager)}
                              title="View details"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Button>
                            <Button
                              size="sm"
                              variant={manager.is_active ? 'danger' : 'secondary'}
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
              {managers && managers.count > pageSize && (
                <div className="p-4 border-t">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(managers.count / pageSize)}
                    onPageChange={setPage}
                    hasNext={!!managers.next}
                    hasPrevious={!!managers.previous}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Manager Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Manager"
        size="md"
      >
        {submitError && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
            {submitError}
          </div>
        )}
        <ManagerForm
          onSubmit={handleCreateManager as (data: CreateUserRequest | UpdateUserRequest) => Promise<void>}
          onCancel={closeModals}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* View Manager Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={closeModals}
        title="Manager Details"
        size="md"
      >
        {selectedManager && (
          <ManagerForm
            manager={selectedManager}
            onSubmit={async () => {}} // Read-only view
            onCancel={closeModals}
            isLoading={false}
          />
        )}
      </Modal>
    </div>
  );
}
