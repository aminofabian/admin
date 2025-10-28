'use client';

import { useState, useEffect } from 'react';
import { agentsApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
import { 
  Card, 
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
  Modal,
  useToast,
  ConfirmModal
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState, AgentForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Agent, PaginatedResponse, CreateUserRequest, UpdateUserRequest } from '@/types';

export default function AgentsPage() {
  const [data, setData] = useState<PaginatedResponse<Agent> | null>(null);
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
    agent: Agent | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    agent: null,
    isLoading: false,
  });

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await agentsApi.list({
        page, page_size: pageSize, search: debouncedSearch || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      await agentsApi.create(formData as CreateUserRequest);

      setSuccessMessage('Agent created successfully!');
      setIsCreateModalOpen(false);
      await loadAgents(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (agent: Agent) => {
    setConfirmModal({
      isOpen: true,
      agent,
      isLoading: false,
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal.agent) return;

    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      const action = confirmModal.agent.is_active ? 'deactivate' : 'activate';
      const actionPast = confirmModal.agent.is_active ? 'deactivated' : 'activated';
      
      await agentsApi.update(confirmModal.agent.id, { is_active: !confirmModal.agent.is_active });
      
      addToast({
        type: 'success',
        title: 'Agent updated',
        description: `"${confirmModal.agent.username}" has been ${actionPast} successfully!`,
      });
      
      setConfirmModal({ isOpen: false, agent: null, isLoading: false });
      await loadAgents(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage,
      });
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelToggle = () => {
    setConfirmModal({ isOpen: false, agent: null, isLoading: false });
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setSubmitError('');
  };

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={loadAgents} />;

  return (
    <div className="space-y-6">
      {/* Header with Search and Action */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agents</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage platform agents and their permissions
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Agent
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

        {/* Search Row */}
        <div className="w-full lg:w-96">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or email..."
          />
        </div>
      </div>

      {/* Agents Table */}
      <Card>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                title="No agents found" 
                description="Get started by creating a new agent"
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
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
                    {data?.results.map((agent) => (
                      <TableRow key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        {/* Username Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                              {agent.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {agent.username}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {agent.role || 'agent'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {agent.email}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={agent.is_active ? 'success' : 'danger'}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>

                        {/* Created Date */}
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(agent.created)}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant={agent.is_active ? 'danger' : 'secondary'}
                              onClick={() => handleToggleStatus(agent)}
                              title={agent.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {agent.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
        </CardContent>
      </Card>

      {/* Create Agent Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Agent"
        size="md"
      >
        {submitError && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
            {submitError}
          </div>
        )}
        <AgentForm
          onSubmit={handleCreateAgent as (data: CreateUserRequest | UpdateUserRequest) => Promise<void>}
          onCancel={closeModals}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelToggle}
        onConfirm={handleConfirmToggle}
        title={`${confirmModal.agent?.is_active ? 'Deactivate' : 'Activate'} Agent`}
        description={`Are you sure you want to ${confirmModal.agent?.is_active ? 'deactivate' : 'activate'} "${confirmModal.agent?.username}"?`}
        confirmText={confirmModal.agent?.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmModal.agent?.is_active ? 'warning' : 'info'}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
}

