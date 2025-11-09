'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { agentsApi, transactionsApi } from '@/lib/api';
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
const SEARCH_PLACEHOLDER_TEXT = 'Search by username or email...';

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
  successMessage: string;
  onDismissSuccess: () => void;
};

function AgentsHeader({ onCreate, successMessage, onDismissSuccess }: AgentsHeaderProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-black/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agents</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage all agent accounts and permissions</p>
          </div>
        </div>
        <Button onClick={onCreate} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm hover:bg-primary/90">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Agent
        </Button>
      </div>
      {successMessage && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 transition-colors dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={onDismissSuccess}
            className="text-green-700 transition-colors hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            aria-label="Dismiss success message"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}

type AgentsSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

function AgentsSearchBar({ value, onChange }: AgentsSearchBarProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
      <SearchInput value={value} onChange={event => onChange(event.target.value)} placeholder={SEARCH_PLACEHOLDER_TEXT} />
    </section>
  );
}

type AgentsTableSectionProps = {
  data: PaginatedResponse<Agent> | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onToggleStatus: (agent: Agent) => void;
  onViewTransactions: (agent: Agent) => Promise<void>;
};

function AgentsTableSection({ data, page, pageSize, onPageChange, onToggleStatus, onViewTransactions }: AgentsTableSectionProps) {
  if (!data || data.results.length === 0) {
    return <AgentsTableEmptyState />;
  }

  return (
    <AgentsTableContent
      data={data}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onToggleStatus={onToggleStatus}
      onViewTransactions={onViewTransactions}
    />
  );
}

type AgentsTableContentProps = {
  data: PaginatedResponse<Agent>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onToggleStatus: (agent: Agent) => void;
  onViewTransactions: (agent: Agent) => Promise<void>;
};

function AgentsTableContent({ data, page, pageSize, onPageChange, onToggleStatus, onViewTransactions }: AgentsTableContentProps) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm shadow-black/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 bg-muted/40 transition-colors dark:border-slate-800/70 dark:bg-slate-900/60">
              <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Username</TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Email</TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Status</TableHead>
              <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Dates</TableHead>
              <TableHead className="text-right font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Actions</TableHead>
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
        <div className="border-t border-border/60 px-6 py-4 transition-colors dark:border-slate-800/70">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(data.count / pageSize)}
            onPageChange={onPageChange}
            hasNext={Boolean(data.next)}
            hasPrevious={Boolean(data.previous)}
          />
        </div>
      )}
    </section>
  );
}

function AgentsTableEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card py-12 text-center shadow-sm shadow-black/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
      <EmptyState title="No agents found" description="Get started by creating a new agent" />
    </section>
  );
}

type AgentRowProps = {
  agent: Agent;
  onToggleStatus: (agent: Agent) => void;
  onViewTransactions: (agent: Agent) => Promise<void>;
};

function AgentRow({ agent, onToggleStatus, onViewTransactions }: AgentRowProps) {
  const styles = getAgentStyles(agent.is_active);

  return (
    <TableRow className="border-border/40 transition-colors hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-900/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground dark:bg-primary/80">
            {agent.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium leading-5 text-foreground">{agent.username}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{agent.role}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <p className="text-sm text-foreground">{agent.email}</p>
      </TableCell>
      <TableCell>
        <Badge variant={styles.statusVariant} className={styles.statusClass}>
          {styles.statusLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-foreground">{formatDate(agent.created)}</div>
        <div className="text-xs text-muted-foreground">Updated {formatDate(agent.modified)}</div>
      </TableCell>
      <TableCell>
        <AgentActionButtons
          agent={agent}
          onToggleStatus={onToggleStatus}
          onViewTransactions={onViewTransactions}
          transactionClass={styles.transactionClass}
          toggleClass={styles.toggleClass}
          toggleLabel={styles.toggleLabel}
        />
      </TableCell>
    </TableRow>
  );
}

type AgentActionButtonsProps = {
  agent: Agent;
  onToggleStatus: (agent: Agent) => void;
  onViewTransactions: (agent: Agent) => Promise<void>;
  transactionClass: string;
  toggleClass: string;
  toggleLabel: string;
};

function AgentActionButtons({ agent, onToggleStatus, onViewTransactions, transactionClass, toggleClass, toggleLabel }: AgentActionButtonsProps) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => void onViewTransactions(agent)}
        className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium shadow-sm ${transactionClass}`}
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.75a5.25 5.25 0 015.25 5.25 5.25 5.25 0 01-5.25 5.25A5.25 5.25 0 016.75 12 5.25 5.25 0 0112 6.75zm0 0v-2.5m0 15v-2.5M17.25 12h2.5m-15 0h2.5" />
        </svg>
        View Transactions
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onToggleStatus(agent)}
        title={toggleLabel}
        className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm ${toggleClass}`}
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {agent.is_active ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          )}
        </svg>
        {toggleLabel}
      </Button>
    </div>
  );
}

function getAgentStyles(isActive: boolean) {
  if (isActive) {
    return {
      statusVariant: 'success' as const,
      statusClass:
        'border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300',
      statusLabel: 'Active',
      transactionClass:
        'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800',
      toggleClass:
        'border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-700/60 dark:bg-slate-900 dark:text-rose-300 dark:hover:border-rose-600 dark:hover:bg-rose-900/40',
      toggleLabel: 'Deactivate',
    };
  }

  return {
    statusVariant: 'danger' as const,
    statusClass:
      'border border-rose-200 bg-rose-50 px-3 py-1 text-rose-600 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300',
    statusLabel: 'Inactive',
    transactionClass:
      'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800',
    toggleClass:
      'border border-emerald-200 bg-white text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/40',
    toggleLabel: 'Activate',
  };
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

type AgentsDashboardViewProps = {
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
  onRetry: () => Promise<void>;
  onSearchChange: (value: string) => void;
  onOpenCreate: () => void;
  onCloseModals: () => void;
  onDismissSuccess: () => void;
  onPageChange: (page: number) => void;
  onToggleStatus: (agent: Agent) => void;
  onViewTransactions: (agent: Agent) => Promise<void>;
  onCreateAgent: (formData: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  onConfirmToggle: () => Promise<void>;
  onCancelToggle: () => void;
};

function AgentsDashboardView({
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
  onRetry,
  onSearchChange,
  onOpenCreate,
  onCloseModals,
  onDismissSuccess,
  onPageChange,
  onToggleStatus,
  onViewTransactions,
  onCreateAgent,
  onConfirmToggle,
  onCancelToggle,
}: AgentsDashboardViewProps) {
  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <>
      <div className="flex flex-col gap-6">
        <AgentsHeader onCreate={onOpenCreate} successMessage={successMessage} onDismissSuccess={onDismissSuccess} />
        <AgentsSearchBar value={search} onChange={onSearchChange} />
        <AgentsTableSection
          data={data}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onToggleStatus={onToggleStatus}
          onViewTransactions={onViewTransactions}
        />
      </div>
      <CreateAgentModal isOpen={isCreateModalOpen} onClose={onCloseModals} onSubmit={onCreateAgent} isLoading={isSubmitting} error={submitError} />
      <ToggleConfirmModal confirmState={confirmModal} onConfirm={onConfirmToggle} onCancel={onCancelToggle} />
    </>
  );
}

export default function AgentsDashboard() {
  const router = useRouter();
  const dashboard = useAgentsDashboard();
  const { addToast } = useToast();

  const viewTransactions = useCallback(async (agent: Agent) => {
    try {
      console.log('🔍 Checking transactions for agent:', agent.username, agent.id);
      
      // Check if agent has any transactions
      const response = await transactionsApi.list({ 
        agent: agent.username, 
        agent_id: agent.id,
        page: 1, 
        page_size: 1 
      });
      
      console.log('📊 Transaction check result:', {
        count: response.count,
        hasResults: response.results.length > 0,
      });
      
      if (response.count === 0) {
        // No transactions found - show toast notification and stay on page
        console.log('✅ Showing toast notification for no transactions');
        addToast({
          type: 'info',
          title: 'No transactions found',
          description: 'This agent has no transactions',
        });
      } else {
        // Transactions exist - redirect to transactions page with agent filter
        console.log('🔀 Redirecting to transactions page');
        router.push(`/dashboard/transactions?agent=${encodeURIComponent(agent.username)}`);
      }
    } catch (error) {
      console.error('❌ Failed to check agent transactions:', error);
      // On error, show toast instead of redirecting to avoid empty page
      addToast({
        type: 'error',
        title: 'Could not check transactions',
        description: 'Please try again or view all transactions',
      });
    }
  }, [router, addToast]);

  return (
    <AgentsDashboardView
      data={dashboard.data}
      isLoading={dashboard.isLoading}
      error={dashboard.error}
      page={dashboard.page}
      pageSize={dashboard.pageSize}
      search={dashboard.search}
      successMessage={dashboard.successMessage}
      isCreateModalOpen={dashboard.isCreateModalOpen}
      isSubmitting={dashboard.isSubmitting}
      submitError={dashboard.submitError}
      confirmModal={dashboard.confirmModal}
      onRetry={dashboard.loadAgents}
      onSearchChange={dashboard.setSearch}
      onOpenCreate={dashboard.openCreateModal}
      onCloseModals={dashboard.closeModals}
      onDismissSuccess={dashboard.dismissSuccessMessage}
      onPageChange={dashboard.setPage}
      onToggleStatus={dashboard.prepareToggle}
      onViewTransactions={viewTransactions}
      onCreateAgent={dashboard.handleCreateAgent}
      onConfirmToggle={dashboard.confirmToggle}
      onCancelToggle={dashboard.cancelToggle}
    />
  );
}
