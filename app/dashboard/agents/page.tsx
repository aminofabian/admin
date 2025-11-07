'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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

  const handleViewTransactions = (agent: Agent) => {
    router.push(`/dashboard/transactions?agent=${encodeURIComponent(agent.username)}`);
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
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Agents</h1>
                <p className="text-muted-foreground mt-1">
                  Manage platform agents and their permissions
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Agent
            </Button>
          </div>
          {/* Success Message */}
          {successMessage && (
            <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 text-green-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage('')} className="text-green-500 hover:text-green-600 transition-colors">
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
      </div>

      {/* Agents Table */}
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        {data?.results.length === 0 ? (
          <div className="relative py-12">
            <EmptyState 
              title="No agents found" 
              description="Get started by creating a new agent"
            />
          </div>
        ) : (
          <div className="relative">
            {/* Table Header */}
            <div className="p-6 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Agent Directory</h3>
                  <p className="text-sm text-muted-foreground">Manage agent accounts and permissions</p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/30">
                    <TableHead className="font-semibold text-foreground">Username</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">Created</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((agent) => (
                    <TableRow key={agent.id} className="hover:bg-card/50 border-border/20 transition-colors">
                      {/* Username Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-lg">
                            {agent.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {agent.username}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {agent.role || 'agent'}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <div className="text-sm text-foreground">
                          {agent.email}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge 
                          variant={agent.is_active ? 'success' : 'danger'}
                          className={agent.is_active 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }
                        >
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>

                      {/* Created Date */}
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(agent.created)}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewTransactions(agent)}
                            className={
                              `flex items-center gap-2 rounded-full border bg-white/60 px-4 py-1.5 text-sm font-semibold shadow-sm transition-all duration-200 dark:bg-slate-900/70 ${
                                agent.is_active
                                  ? 'border-emerald-300/60 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50/80 dark:border-emerald-400/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                                  : 'border-amber-300/60 text-amber-600 hover:border-amber-400 hover:bg-amber-50/80 dark:border-amber-400/40 dark:text-amber-300 dark:hover:bg-amber-900/45'
                              }`
                            }
                          >
                            <svg
                              aria-hidden="true"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 6.75a5.25 5.25 0 015.25 5.25 5.25 5.25 0 01-5.25 5.25A5.25 5.25 0 016.75 12 5.25 5.25 0 0112 6.75zm0 0v-2.5m0 15v-2.5M17.25 12h2.5m-15 0h2.5"
                              />
                            </svg>
                            View Transactions
                          </Button>
                          <Button
                            size="sm"
                            variant={agent.is_active ? 'danger' : 'secondary'}
                            onClick={() => handleToggleStatus(agent)}
                            title={agent.is_active ? 'Deactivate' : 'Activate'}
                            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition-all duration-200 ${agent.is_active 
                              ? 'border border-rose-400/60 bg-rose-50/80 text-rose-600 hover:border-rose-500 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/55' 
                              : 'border border-sky-400/60 bg-sky-50/80 text-sky-600 hover:border-sky-500 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/55'
                            }`
                            }
                          >
                            <svg
                              aria-hidden="true"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              {agent.is_active ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              ) : (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M12 4v16m8-8H4"
                                />
                              )}
                            </svg>
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
              <div className="px-6 py-4 border-t border-border/30">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(data.count / pageSize)}
                  onPageChange={setPage}
                  hasNext={!!data.next}
                  hasPrevious={!!data.previous}
                />
              </div>
            )}
          </div>
        )}
      </div>

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

