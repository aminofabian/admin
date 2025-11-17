'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { agentsApi, transactionsApi } from '@/lib/api';
import { usePagination } from '@/lib/hooks';
import {
  Badge,
  Button,
  Drawer,
  Pagination,
  PasswordResetDrawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
  ConfirmModal,
} from '@/components/ui';
import { AgentForm, EmptyState, ErrorState, LoadingState, EditProfileDrawer, type EditProfileFormData } from '@/components/features';
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
  successMessage: string;
  isCreateModalOpen: boolean;
  isSubmitting: boolean;
  submitError: string;
  confirmModal: ConfirmModalState;
  loadAgents: () => Promise<void>;
  setPage: (page: number) => void;
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
  const { addToast } = useToast();

  const loadAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await agentsApi.list({ page, page_size: pageSize });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

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
    successMessage,
    isCreateModalOpen,
    isSubmitting,
    submitError,
    confirmModal,
    loadAgents,
    setPage,
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
    setPage,
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


type AgentsTableSectionProps = {
  data: PaginatedResponse<Agent> | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onOpenActions: (agent: Agent) => void;
};

function AgentsTableSection({ data, page, pageSize, onPageChange, onOpenActions }: AgentsTableSectionProps) {
  if (!data || data.results.length === 0) {
    return <AgentsTableEmptyState />;
  }

  return (
    <AgentsTableContent
      data={data}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onOpenActions={onOpenActions}
    />
  );
}

type AgentsTableContentProps = {
  data: PaginatedResponse<Agent>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onOpenActions: (agent: Agent) => void;
};

function AgentsTableContent({ data, page, pageSize, onPageChange, onOpenActions }: AgentsTableContentProps) {
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
              <AgentRow key={agent.id} agent={agent} onOpenActions={onOpenActions} />
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
  onOpenActions: (agent: Agent) => void;
};

function AgentRow({ agent, onOpenActions }: AgentRowProps) {
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
      </TableCell>
      <TableCell>
        <AgentActionButtons
          agent={agent}
          onOpenActions={onOpenActions}
        />
      </TableCell>
    </TableRow>
  );
}

type AgentActionButtonsProps = {
  agent: Agent;
  onOpenActions: (agent: Agent) => void;
};

function AgentActionButtons({ agent, onOpenActions }: AgentActionButtonsProps) {
  return (
    <div className="flex items-center justify-end">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onOpenActions(agent)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        title="Actions"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
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
      toggleLabel: 'Deactivate',
    };
  }

  return {
    statusVariant: 'danger' as const,
    statusClass:
      'border border-rose-200 bg-rose-50 px-3 py-1 text-rose-600 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300',
    statusLabel: 'Inactive',
    toggleLabel: 'Activate',
  };
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

type CreateAgentDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  isLoading: boolean;
  error: string;
};

function CreateAgentDrawer({ isOpen, onClose, onSubmit, isLoading, error }: CreateAgentDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Create New Agent" size="md">
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      <AgentForm onSubmit={onSubmit} onCancel={onClose} isLoading={isLoading} />
    </Drawer>
  );
}


type AgentActionsDrawerProps = {
  isOpen: boolean;
  agent: Agent | null;
  onClose: () => void;
  onViewTransactions: () => void;
  onViewPlayers: () => void;
  onEditProfile: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
};

function AgentActionsDrawer({
  isOpen,
  agent,
  onClose,
  onViewTransactions,
  onViewPlayers,
  onEditProfile,
  onResetPassword,
  onToggleStatus,
}: AgentActionsDrawerProps) {
  if (!agent) return null;

  const toggleLabel = agent.is_active ? 'Deactivate' : 'Activate';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Actions for ${agent.username}`} size="sm">
      <div className="space-y-3">
        <Button
          variant="ghost"
          onClick={onViewTransactions}
          className="w-full justify-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.75a5.25 5.25 0 015.25 5.25 5.25 5.25 0 01-5.25 5.25A5.25 5.25 0 016.75 12 5.25 5.25 0 0112 6.75zm0 0v-2.5m0 15v-2.5M17.25 12h2.5m-15 0h2.5" />
          </svg>
          <span>View Transactions</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={onViewPlayers}
          className="w-full justify-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <span>View Players</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={onEditProfile}
          className="w-full justify-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span>Edit Profile</span>
        </Button>

        <Button
          variant="ghost"
          onClick={onResetPassword}
          className="w-full justify-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          <span>Reset Password</span>
        </Button>

        <Button
          variant="ghost"
          onClick={onToggleStatus}
          className={`w-full justify-start gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold shadow-sm ${
            agent.is_active
              ? 'border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-700/60 dark:bg-slate-900 dark:text-rose-300 dark:hover:border-rose-600 dark:hover:bg-rose-900/40'
              : 'border border-emerald-200 bg-white text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/40'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {agent.is_active ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            )}
          </svg>
          <span>{toggleLabel}</span>
        </Button>
      </div>
    </Drawer>
  );
}

type PasswordResetState = {
  isOpen: boolean;
  agent: Agent | null;
  isLoading: boolean;
};

type ActionDrawerState = {
  isOpen: boolean;
  agent: Agent | null;
};

type AgentsDashboardViewProps = {
  data: PaginatedResponse<Agent> | null;
  isLoading: boolean;
  error: string;
  page: number;
  pageSize: number;
  successMessage: string;
  isCreateModalOpen: boolean;
  isSubmitting: boolean;
  submitError: string;
  confirmModal: ConfirmModalState;
  passwordResetState: {
    isOpen: boolean;
    agent: Agent | null;
    isLoading: boolean;
  };
  editProfileDrawer: {
    isOpen: boolean;
    agent: Agent | null;
    isLoading: boolean;
  };
  profileFormData: EditProfileFormData;
  setProfileFormData: React.Dispatch<React.SetStateAction<EditProfileFormData>>;
  actionDrawerState: ActionDrawerState;
  onRetry: () => Promise<void>;
  onOpenCreate: () => void;
  onCloseModals: () => void;
  onDismissSuccess: () => void;
  onPageChange: (page: number) => void;
  onViewTransactions: (agent: Agent) => Promise<void>;
  onViewPlayers: (agent: Agent) => void;
  onOpenEditProfile: (agent: Agent) => void;
  onResetPassword: (agent: Agent) => void;
  onToggleStatus: (agent: Agent) => void;
  onConfirmPasswordReset: (password: string, confirmPassword: string) => Promise<void>;
  onCancelPasswordReset: () => void;
  onUpdateProfile: () => Promise<void>;
  onCloseEditProfile: () => void;
  onOpenActions: (agent: Agent) => void;
  onCloseActions: () => void;
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
  successMessage,
  isCreateModalOpen,
  isSubmitting,
  submitError,
  confirmModal,
  passwordResetState,
  editProfileDrawer,
  profileFormData,
  setProfileFormData,
  actionDrawerState,
  onRetry,
  onOpenCreate,
  onCloseModals,
  onDismissSuccess,
  onPageChange,
  onViewTransactions,
  onViewPlayers,
  onOpenEditProfile,
  onResetPassword,
  onToggleStatus,
  onConfirmPasswordReset,
  onCancelPasswordReset,
  onUpdateProfile,
  onCloseEditProfile,
  onOpenActions,
  onCloseActions,
  onCreateAgent,
  onConfirmToggle,
  onCancelToggle,
}: AgentsDashboardViewProps) {
  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />;

  const agent = actionDrawerState.agent;

  return (
    <>
      <div className="flex flex-col gap-6">
        <AgentsHeader onCreate={onOpenCreate} successMessage={successMessage} onDismissSuccess={onDismissSuccess} />
        <AgentsTableSection
          data={data}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onOpenActions={onOpenActions}
        />
      </div>
      <CreateAgentDrawer isOpen={isCreateModalOpen} onClose={onCloseModals} onSubmit={onCreateAgent} isLoading={isSubmitting} error={submitError} />
      <EditProfileDrawer
        isOpen={editProfileDrawer.isOpen}
        onClose={onCloseEditProfile}
        profileFormData={profileFormData}
        setProfileFormData={setProfileFormData}
        isUpdating={editProfileDrawer.isLoading}
        onUpdate={onUpdateProfile}
        title="Edit Agent Profile"
        showDob={false}
      />
      <ToggleConfirmModal confirmState={confirmModal} onConfirm={onConfirmToggle} onCancel={onCancelToggle} />
      <PasswordResetDrawer
        isOpen={passwordResetState.isOpen}
        onClose={onCancelPasswordReset}
        onConfirm={onConfirmPasswordReset}
        username={passwordResetState.agent?.username}
        isLoading={passwordResetState.isLoading}
        title="Reset Agent Password"
      />
      <AgentActionsDrawer
        isOpen={actionDrawerState.isOpen}
        agent={agent}
        onClose={onCloseActions}
        onViewTransactions={() => {
          onCloseActions();
          if (agent) void onViewTransactions(agent);
        }}
        onViewPlayers={() => {
          onCloseActions();
          if (agent) onViewPlayers(agent);
        }}
        onEditProfile={() => {
          onCloseActions();
          if (agent) onOpenEditProfile(agent);
        }}
        onResetPassword={() => {
          onCloseActions();
          if (agent) onResetPassword(agent);
        }}
        onToggleStatus={() => {
          onCloseActions();
          if (agent) onToggleStatus(agent);
        }}
      />
    </>
  );
}

export default function AgentsDashboard() {
  const router = useRouter();
  const dashboard = useAgentsDashboard();
  const { addToast } = useToast();
  const [editProfileDrawer, setEditProfileDrawer] = useState<{
    isOpen: boolean;
    agent: Agent | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    agent: null,
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
  const [actionDrawerState, setActionDrawerState] = useState<ActionDrawerState>({
    isOpen: false,
    agent: null,
  });

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
        console.log(' Showing toast notification for no transactions');
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

  const viewPlayers = useCallback((agent: Agent) => {
    // Redirect to players page with agent filter (using username like in players page filter)
    router.push(`/dashboard/players?agent=${encodeURIComponent(agent.username)}`);
  }, [router]);

  const handleOpenEditProfile = useCallback((agent: Agent) => {
    setProfileFormData({
      username: agent.username || '',
      full_name: (agent as any).full_name || '',
      dob: (agent as any).dob || '',
      email: agent.email || '',
      password: '',
      confirmPassword: '',
      is_active: agent.is_active,
    });
    setEditProfileDrawer({
      isOpen: true,
      agent,
      isLoading: false,
    });
  }, []);

  const [passwordResetState, setPasswordResetState] = useState<{
    isOpen: boolean;
    agent: Agent | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    agent: null,
    isLoading: false,
  });

  const handleResetPassword = useCallback((agent: Agent) => {
    setPasswordResetState({
      isOpen: true,
      agent,
      isLoading: false,
    });
  }, []);

  const handleConfirmPasswordReset = useCallback(async (password: string, confirmPassword: string) => {
    if (!passwordResetState.agent) return;

    setPasswordResetState((prev) => ({ ...prev, isLoading: true }));

    try {
      await agentsApi.update(passwordResetState.agent.id, { password });

      addToast({
        type: 'success',
        title: 'Password reset',
        description: `Password for "${passwordResetState.agent.username}" has been reset successfully!`,
      });

      setPasswordResetState({ isOpen: false, agent: null, isLoading: false });
      await dashboard.loadAgents();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      addToast({
        type: 'error',
        title: 'Reset failed',
        description: errorMessage,
      });
      setPasswordResetState((prev) => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, [passwordResetState.agent, addToast, dashboard]);

  const handleCancelPasswordReset = useCallback(() => {
    setPasswordResetState({ isOpen: false, agent: null, isLoading: false });
  }, []);

  const handleUpdateProfile = useCallback(async () => {
    if (!editProfileDrawer.agent || editProfileDrawer.isLoading) {
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

      await agentsApi.update(editProfileDrawer.agent.id, updatePayload);

      addToast({
        type: 'success',
        title: 'Profile updated successfully',
        description: `"${editProfileDrawer.agent.username}" has been updated successfully!`,
      });

      setEditProfileDrawer({ isOpen: false, agent: null, isLoading: false });
      await dashboard.loadAgents();
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
  }, [editProfileDrawer, profileFormData, addToast, dashboard]);

  const handleCloseEditProfile = useCallback(() => {
    setEditProfileDrawer({ isOpen: false, agent: null, isLoading: false });
  }, []);

  const handleOpenActions = useCallback((agent: Agent) => {
    setActionDrawerState({ isOpen: true, agent });
  }, []);

  const handleCloseActions = useCallback(() => {
    setActionDrawerState({ isOpen: false, agent: null });
  }, []);

  return (
    <AgentsDashboardView
      data={dashboard.data}
      isLoading={dashboard.isLoading}
      error={dashboard.error}
      page={dashboard.page}
      pageSize={dashboard.pageSize}
      successMessage={dashboard.successMessage}
      isCreateModalOpen={dashboard.isCreateModalOpen}
      isSubmitting={dashboard.isSubmitting}
      submitError={dashboard.submitError}
      editProfileDrawer={editProfileDrawer}
      profileFormData={profileFormData}
      setProfileFormData={setProfileFormData}
      actionDrawerState={actionDrawerState}
      onRetry={dashboard.loadAgents}
      onOpenCreate={dashboard.openCreateModal}
      onCloseModals={dashboard.closeModals}
      onDismissSuccess={dashboard.dismissSuccessMessage}
      onPageChange={dashboard.setPage}
      confirmModal={dashboard.confirmModal}
      passwordResetState={passwordResetState}
      onViewTransactions={viewTransactions}
      onViewPlayers={viewPlayers}
      onOpenEditProfile={handleOpenEditProfile}
      onResetPassword={handleResetPassword}
      onToggleStatus={dashboard.prepareToggle}
      onConfirmPasswordReset={handleConfirmPasswordReset}
      onCancelPasswordReset={handleCancelPasswordReset}
      onUpdateProfile={handleUpdateProfile}
      onCloseEditProfile={handleCloseEditProfile}
      onOpenActions={handleOpenActions}
      onCloseActions={handleCloseActions}
      onCreateAgent={dashboard.handleCreateAgent}
      onConfirmToggle={dashboard.confirmToggle}
      onCancelToggle={dashboard.cancelToggle}
    />
  );
}
