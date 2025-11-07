'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { agentsApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
import {
  Badge,
  Button,
  ConfirmModal,
  Modal,
  Pagination,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@/components/ui';
import { AgentForm, EmptyState, ErrorState, LoadingState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Agent, CreateUserRequest, PaginatedResponse, UpdateUserRequest } from '@/types';

const SUCCESS_MESSAGE_TIMEOUT_MS = 5000;

type ConfirmModalState = { isOpen: boolean; agent: Agent | null; isLoading: boolean };

type AgentsDashboardState = {
  data: PaginatedResponse<Agent> | null;
  isLoading: boolean;
  error: string;
  page: number;
  pageSize: number;
  search: string;
  successMessage: string;
  isCreateModalOpen: boolean;
  isSubmitting: boolean;
  submitError: string;
  confirmModal: ConfirmModalState;
  loadAgents: () => Promise<void>;
  setPage: (page: number) => void;
  setSearch: (value: string) => void;
  openCreateModal: () => void;
  closeModals: () => void;
  dismissSuccessMessage: () => void;
  handleCreateAgent: (formData: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  prepareToggle: (agent: Agent) => void;
  confirmToggle: () => Promise<void>;
  cancelToggle: () => void;
};

function useAgentsDashboard(): AgentsDashboardState {
  const [data, setData] = useState<PaginatedResponse<Agent> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ isOpen: false, agent: null, isLoading: false });
  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();
  const { addToast } = useToast();

  const loadAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await agentsApi.list({ page, page_size: pageSize, search: debouncedSearch || undefined });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, pageSize]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), SUCCESS_MESSAGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleCreateAgent = useCallback(async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      await agentsApi.create(formData as CreateUserRequest);
      setSuccessMessage('Agent created successfully!');
      setIsCreateModalOpen(false);
      await loadAgents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create agent';
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [loadAgents]);

  const prepareToggle = useCallback((agent: Agent) => {
    setConfirmModal({ isOpen: true, agent, isLoading: false });
  }, []);

  const confirmToggle = useCallback(async () => {
    if (!confirmModal.agent) return;
    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      const isActive = confirmModal.agent.is_active;
      const actionPast = isActive ? 'deactivated' : 'activated';
      await agentsApi.update(confirmModal.agent.id, { is_active: !isActive });
      addToast({
        type: 'success',
        title: 'Agent updated',
        description: `"${confirmModal.agent.username}" has been ${actionPast} successfully!`,
      });
      setConfirmModal({ isOpen: false, agent: null, isLoading: false });
      await loadAgents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update agent status';
      addToast({ type: 'error', title: 'Update failed', description: message });
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  }, [addToast, confirmModal, loadAgents]);

  const cancelToggle = useCallback(() => {
    setConfirmModal({ isOpen: false, agent: null, isLoading: false });
  }, []);

  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
    setSubmitError('');
  }, []);

  const closeModals = useCallback(() => {
    setIsCreateModalOpen(false);
    setSubmitError('');
  }, []);

  const dismissSuccessMessage = useCallback(() => setSuccessMessage(''), []);

  return useMemo(() => ({
    data,
    isLoading,
    error,
    page,
    pageSize,
    search,
    successMessage,
    isCreateModalOpen,
    isSubmitting,
    submitError,
    confirmModal,
    loadAgents,
    setPage,
    setSearch,
    openCreateModal,
    closeModals,
    dismissSuccessMessage,
    handleCreateAgent,
    prepareToggle,
    confirmToggle,
    cancelToggle,
  }), [
    cancelToggle,
    closeModals,
    confirmModal,
    confirmToggle,
    data,
    dismissSuccessMessage,
    error,
    handleCreateAgent,
    isCreateModalOpen,
    isLoading,
    isSubmitting,
    loadAgents,
    openCreateModal,
    page,
    pageSize,
    prepareToggle,
    search,
    setPage,
    setSearch,
    submitError,
    successMessage,
  ]);
}

type AgentsHeaderProps = {
  onCreate: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  successMessage: string;
  onDismissSuccess: () => void;
};

function AgentsHeader({ onCreate, search, onSearchChange, successMessage, onDismissSuccess }: AgentsHeaderProps) {
  return (
    <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
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
              <p className="text-muted-foreground mt-1">Manage platform agents and their permissions</p>
            </div>
          </div>
          <Button onClick={onCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Agent
          </Button>
        </div>

        {successMessage && (
          <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 text-green-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
            <button onClick={onDismissSuccess} className="text-green-500 hover:text-green-600 transition-colors" aria-label="Dismiss success message">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="w-full lg:w-96">
          <SearchInput value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Search by username or email..." />
        </div>
      </div>
    </div>
  );
}

type AgentsTableSectionProps = {
  data: PaginatedResponse<Agent> | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onToggleStatus: (agent: Agent) => void;
  onViewTransactions: (agent: Agent) => void;
};

function AgentsTableSection({ data, page, pageSize, onPageChange, onToggleStatus, onViewTransactions }: AgentsTableSectionProps) {
  if (!data || data.results.length === 0) {
    return (
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        <div className="relative py-12">
          <EmptyState title="No agents found" description="Get started by creating a new agent" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
      </div>
      <div className="relative">
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
              {data.results.map(agent => (
                <AgentRow key={agent.id} agent={agent} onToggleStatus={onToggleStatus} onViewTransactions={onViewTransactions} />
              ))}
            </TableBody>
          </Table>
        </div>

        {data.count > pageSize && (
          <div className="px-6 py-4 border-t border-border/30">
            <Pagination currentPage={page} totalPages={Math.ceil(data.count / pageSize)} onPageChange={onPageChange} hasNext={Boolean(data.next)} hasPrevious={Boolean(data.previous)} />
          </div>
        )}
      </div>
    </div>
  );
}

type AgentRowProps = {
  agent: Agent;
  onToggleStatus: (agent: Agent) => void;
  onViewTransactions: (agent: Agent) => void;
};

function AgentRow({ agent, onToggleStatus, onViewTransactions }: AgentRowProps) {
  const statusVariant = agent.is_active ? 'success' : 'danger';
  const statusClass = agent.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20';
  const transactionClass = agent.is_active
    ? 'border-emerald-300/60 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50/80 dark:border-emerald-400/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
    : 'border-amber-300/60 text-amber-600 hover:border-amber-400 hover:bg-amber-50/80 dark:border-amber-400/40 dark:text-amber-300 dark:hover:bg-amber-900/45';
  const toggleClass = agent.is_active
    ? 'border border-rose-400/60 bg-rose-50/80 text-rose-600 hover:border-rose-500 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/55'
    : 'border border-sky-400/60 bg-sky-50/80 text-sky-600 hover:border-sky-500 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/55';

  return (
    <TableRow className="hover:bg-card/50 border-border/20 transition-colors">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-lg">
            {agent.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-foreground">{agent.username}</div>
            <div className="text-xs text-muted-foreground">{agent.role || 'agent'}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-foreground">{agent.email}</div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className={statusClass}>
          {agent.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">{formatDate(agent.created)}</div>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewTransactions(agent)}
            className={`flex items-center gap-2 rounded-full border bg-white/60 px-4 py-1.5 text-sm font-semibold shadow-sm transition-all duration-200 dark:bg-slate-900/70 ${transactionClass}`}
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.75a5.25 5.25 0 015.25 5.25 5.25 5.25 0 01-5.25 5.25A5.25 5.25 0 016.75 12 5.25 5.25 0 0112 6.75zm0 0v-2.5m0 15v-2.5M17.25 12h2.5m-15 0h2.5" />
            </svg>
            View Transactions
          </Button>
          <Button
            size="sm"
            variant={agent.is_active ? 'danger' : 'secondary'}
            onClick={() => onToggleStatus(agent)}
            title={agent.is_active ? 'Deactivate' : 'Activate'}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition-all duration-200 ${toggleClass}`}
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {agent.is_active ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              )}
            </svg>
            {agent.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

type CreateAgentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  isLoading: boolean;
  error: string;
};

function CreateAgentModal({ isOpen, onClose, onSubmit, isLoading, error }: CreateAgentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Agent" size="md">
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      <AgentForm onSubmit={onSubmit} onCancel={onClose} isLoading={isLoading} />
    </Modal>
  );
}

type ToggleConfirmModalProps = {
  confirmState: ConfirmModalState;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

function ToggleConfirmModal({ confirmState, onConfirm, onCancel }: ToggleConfirmModalProps) {
  const action = confirmState.agent?.is_active ? 'Deactivate' : 'Activate';
  const username = confirmState.agent?.username ?? '';

  return (
    <ConfirmModal
      isOpen={confirmState.isOpen}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={`${action} Agent`}
      description={`Are you sure you want to ${action.toLowerCase()} "${username}"?`}
      confirmText={action}
      variant={confirmState.agent?.is_active ? 'warning' : 'info'}
      isLoading={confirmState.isLoading}
    />
  );
}

export default function AgentsDashboard() {
  const router = useRouter();
  const {
    data,
    isLoading,
    error,
    page,
    pageSize,
    search,
    successMessage,
    isCreateModalOpen,
    isSubmitting,
    submitError,
    confirmModal,
    loadAgents,
    setPage,
    setSearch,
    openCreateModal,
    closeModals,
    dismissSuccessMessage,
    handleCreateAgent,
    prepareToggle,
    confirmToggle,
    cancelToggle,
  } = useAgentsDashboard();

  const viewTransactions = useCallback((agent: Agent) => {
    router.push(`/dashboard/transactions?agent=${encodeURIComponent(agent.username)}`);
  }, [router]);

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={loadAgents} />;

  return (
    <div className="space-y-6">
      <AgentsHeader
        onCreate={openCreateModal}
        search={search}
        onSearchChange={setSearch}
        successMessage={successMessage}
        onDismissSuccess={dismissSuccessMessage}
      />
      <AgentsTableSection
        data={data}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onToggleStatus={prepareToggle}
        onViewTransactions={viewTransactions}
      />
      <CreateAgentModal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        onSubmit={handleCreateAgent}
        isLoading={isSubmitting}
        error={submitError}
      />
      <ToggleConfirmModal confirmState={confirmModal} onConfirm={confirmToggle} onCancel={cancelToggle} />
    </div>
  );
}


