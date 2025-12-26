'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { agentsApi, transactionsApi, affiliatesApi } from '@/lib/api';
import { usePagination } from '@/lib/hooks';
import { validatePassword } from '@/lib/utils/password-validation';
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
import { AgentForm, EmptyState, ErrorState, EditProfileDrawer, type EditProfileFormData, CommissionSettingsForm } from '@/components/features';
import { Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';
import type { Agent, CreateUserRequest, PaginatedResponse, UpdateUserRequest, Affiliate, UpdateAffiliateRequest, AgentDashboardResponse } from '@/types';

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
  updateAgentCommission: (agentId: number, commissionData: { affiliation_percentage?: string; affiliation_fee_percentage?: string; payment_method_fee_percentage?: string; affiliate_link?: string }) => void;
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

  const updateAgentCommission = useCallback((agentId: number, commissionData: { affiliation_percentage?: string; affiliation_fee_percentage?: string; payment_method_fee_percentage?: string; affiliate_link?: string }) => {
    setData((prevData) => {
      if (!prevData) return prevData;
      
      return {
        ...prevData,
        results: prevData.results.map((agent) => {
          if (agent.id === agentId) {
            const updatedAgent = { ...agent } as Agent & {
              affiliation_percentage?: string;
              affiliation_fee_percentage?: string;
              payment_method_fee_percentage?: string;
              affiliate_link?: string;
            };
            
            if (commissionData.affiliation_percentage !== undefined) {
              updatedAgent.affiliation_percentage = commissionData.affiliation_percentage;
            }
            if (commissionData.affiliation_fee_percentage !== undefined) {
              updatedAgent.affiliation_fee_percentage = commissionData.affiliation_fee_percentage;
            }
            if (commissionData.payment_method_fee_percentage !== undefined) {
              updatedAgent.payment_method_fee_percentage = commissionData.payment_method_fee_percentage;
            }
            if (commissionData.affiliate_link !== undefined) {
              updatedAgent.affiliate_link = commissionData.affiliate_link;
            }
            
            return updatedAgent as Agent;
          }
          return agent;
        }),
      };
    });
  }, []);

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
    updateAgentCommission,
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
    updateAgentCommission,
  ]);
}

type AgentsHeaderProps = {
  onCreate: () => void;
  successMessage: string;
  onDismissSuccess: () => void;
};

function AgentsHeader({ onCreate, successMessage, onDismissSuccess }: AgentsHeaderProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
      {successMessage && (
        <div className="px-3 sm:px-4 md:p-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-800 shadow-sm dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                />
              </svg>
              <span>{successMessage}</span>
            </div>
            <button
              onClick={onDismissSuccess}
              className="text-green-600 transition-colors hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 touch-manipulation"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* Single compact row - everything in one line */}
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
        {/* Icon */}
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        
        {/* Title */}
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
          Agents
        </h2>
        
        {/* Spacer */}
        <div className="flex-1 min-w-0" />
        
        {/* Add Agent Button */}
        <Button 
          variant="primary"
          size="sm" 
          onClick={onCreate} 
          className="shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Agent
        </Button>
      </div>
    </div>
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
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {!data || data.results.length === 0 ? (
        <div className="py-12">
          <EmptyState 
            title="No Agents found" 
            description="Get started by creating a new Agent"
          />
        </div>
      ) : (
        <AgentsTableContent
          data={data}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onOpenActions={onOpenActions}
        />
      )}
    </div>
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
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
        {data.results.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onOpenActions={onOpenActions}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Payment Method Fee</TableHead>
              <TableHead>System Fee</TableHead>
              <TableHead>Affiliate Link</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(data.count / pageSize)}
            onPageChange={onPageChange}
            hasNext={Boolean(data.next)}
            hasPrevious={Boolean(data.previous)}
          />
        </div>
      )}
    </>
  );
}


type AgentCardProps = {
  agent: Agent;
  onOpenActions: (agent: Agent) => void;
};

function AgentCard({ agent, onOpenActions }: AgentCardProps) {
  const styles = getAgentStyles(agent.is_active);
  const agentWithAffiliate = agent as Agent & {
    affiliation_percentage?: string;
    payment_method_fee_percentage?: string;
    affiliation_fee_percentage?: string;
    affiliate_link?: string;
  };

  const formatPercentage = (value: string | undefined): string => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return isNaN(num) ? 'N/A' : `${num.toFixed(2)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Top Section: Avatar, Name, Status */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
              {agent.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {agent.username}
                </h3>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-0.5">
                  {agent.role}
                </p>
              </div>
              <Badge 
                variant={styles.statusVariant} 
                className="text-[10px] px-2 py-0.5 shrink-0"
              >
                {styles.statusLabel}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Email */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
            {agent.email}
          </span>
        </div>
      </div>

      {/* Commission Section */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-0.5">Commission</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatPercentage(agentWithAffiliate.affiliation_percentage)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-0.5">Payment Method Fee</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatPercentage(agentWithAffiliate.payment_method_fee_percentage)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-0.5">System Fee</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatPercentage(agentWithAffiliate.affiliation_fee_percentage)}
            </p>
          </div>
        </div>
      </div>

      {/* Affiliate Link Section */}
      {agentWithAffiliate.affiliate_link && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <a
              href={agentWithAffiliate.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
              title={agentWithAffiliate.affiliate_link}
            >
              {agentWithAffiliate.affiliate_link}
            </a>
          </div>
        </div>
      )}

      {/* Bottom Section: Date & Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(agent.created)}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onOpenActions(agent)}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 touch-manipulation"
          title="Actions"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
          <span className="hidden sm:inline">Actions</span>
        </Button>
      </div>
    </div>
  );
}

type AgentRowProps = {
  agent: Agent;
  onOpenActions: (agent: Agent) => void;
};

function AgentRow({ agent, onOpenActions }: AgentRowProps) {
  const styles = getAgentStyles(agent.is_active);
  const agentWithAffiliate = agent as Agent & {
    affiliation_percentage?: string;
    payment_method_fee_percentage?: string;
    affiliation_fee_percentage?: string;
    affiliate_link?: string;
  };

  const formatPercentage = (value: string | undefined): string => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return isNaN(num) ? 'N/A' : `${num.toFixed(2)}%`;
  };

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
            {agent.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {agent.username}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{agent.role}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-700 dark:text-gray-300">{agent.email}</div>
      </TableCell>
      <TableCell>
        <Badge variant={styles.statusVariant}>
          {styles.statusLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {formatPercentage(agentWithAffiliate.affiliation_percentage)}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {formatPercentage(agentWithAffiliate.payment_method_fee_percentage)}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {formatPercentage(agentWithAffiliate.affiliation_fee_percentage)}
        </div>
      </TableCell>
      <TableCell>
        {agentWithAffiliate.affiliate_link ? (
          <a
            href={agentWithAffiliate.affiliate_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs block"
            title={agentWithAffiliate.affiliate_link}
          >
            {agentWithAffiliate.affiliate_link}
          </a>
        ) : (
          <div className="text-sm text-gray-400 dark:text-gray-500">N/A</div>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(agent.created)}
        </div>
      </TableCell>
      <TableCell className="text-right">
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
        variant="ghost"
        size="sm"
        onClick={() => onOpenActions(agent)}
        title="Actions"
        className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
        Actions
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

type CommissionEditDrawerProps = {
  isOpen: boolean;
  agent: Agent | null;
  affiliate: Affiliate | null;
  isLoading: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onUpdate: (data: UpdateAffiliateRequest) => Promise<void>;
};

function CommissionEditDrawer({
  isOpen,
  agent,
  affiliate,
  isLoading,
  isUpdating,
  onClose,
  onUpdate,
}: CommissionEditDrawerProps) {
  if (!agent) return null;

  if (isLoading) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} title={`Edit Commission - ${agent.username}`} size="md">
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </Drawer>
    );
  }

  if (!affiliate) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} title={`Edit Commission - ${agent.username}`} size="md">
        <div className="py-12">
          <EmptyState
            title="Affiliate data not found"
            description="This agent does not have affiliate commission settings configured."
          />
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Edit Commission - ${agent.username}`} size="md">
      <CommissionSettingsForm
        affiliate={affiliate}
        onSubmit={onUpdate}
        onCancel={onClose}
        isLoading={isUpdating}
      />
    </Drawer>
  );
}

type AgentStatsDrawerProps = {
  isOpen: boolean;
  agent: Agent | null;
  statsData: AgentDashboardResponse | null;
  isLoading: boolean;
  onClose: () => void;
};

function AgentStatsDrawer({
  isOpen,
  agent,
  statsData,
  isLoading,
  onClose,
}: AgentStatsDrawerProps) {
  if (!agent) return null;

  const stats = statsData?.agent_stats;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Agent Stats - ${agent.username}`} size="md">
      {isLoading ? (
        <div className="space-y-4 py-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !statsData || !stats ? (
        <div className="py-12">
          <EmptyState
            title="Stats not available"
            description="This agent does not have statistics available."
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
              {statsData.agent_username}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              {agent.email}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Payment Method Fee</p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  ${stats.payment_method_fee.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Affiliation Fee</p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  ${stats.affiliation_fee.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Total Players</p>
                <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                {stats.total_players}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-green-900 dark:text-green-300">Total Earnings</p>
                <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.818.182a2.5 2.5 0 004.364 0l.818-.182M12 6V4.5m0 0V3m0 1.5h3.75M12 6H8.25m3.75 0v1.5m0 0H8.25m3.75 0h3.75m-3.75 0v1.5m0 0H8.25" />
                </svg>
              </div>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">
                ${stats.total_earnings.toFixed(2)}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-purple-900 dark:text-purple-300">Total Topup</p>
                <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                ${stats.total_topup.toFixed(2)}
              </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-orange-900 dark:text-orange-300">Total Cashout</p>
                <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                ${stats.total_cashout.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </Drawer>
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
  onEditCommission: () => void;
  onViewStats: () => void;
};

function AgentActionsDrawer({
  isOpen,
  agent,
  onClose,
  onViewTransactions,
  onViewPlayers,
  onEditProfile,
  onEditCommission,
  onViewStats,
}: AgentActionsDrawerProps) {
  if (!agent) return null;

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
          onClick={onEditCommission}
          className="w-full justify-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375A1.125 1.125 0 012 18.75v-9.75A1.125 1.125 0 013.375 6h.375m0 0H3m16.5 0v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375A1.125 1.125 0 012 18.75v-9.75A1.125 1.125 0 013.375 6h.375m0 0H3" />
          </svg>
          <span>Edit Affiliate Commission</span>
        </Button>

        <Button
          variant="ghost"
          onClick={onViewStats}
          className="w-full justify-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <span>View Agent Stats</span>
        </Button>
      </div>
    </Drawer>
  );
}

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
  commissionDrawer: {
    isOpen: boolean;
    agent: Agent | null;
    affiliate: Affiliate | null;
    isLoading: boolean;
    isUpdating: boolean;
  };
  statsDrawer: {
    isOpen: boolean;
    agent: Agent | null;
    statsData: AgentDashboardResponse | null;
    isLoading: boolean;
  };
  onRetry: () => Promise<void>;
  onOpenCreate: () => void;
  onCloseModals: () => void;
  onDismissSuccess: () => void;
  onPageChange: (page: number) => void;
  onViewTransactions: (agent: Agent) => Promise<void>;
  onViewPlayers: (agent: Agent) => void;
  onOpenEditProfile: (agent: Agent) => void;
  onConfirmPasswordReset: (password: string, confirmPassword: string) => Promise<void>;
  onCancelPasswordReset: () => void;
  onUpdateProfile: () => Promise<void>;
  onCloseEditProfile: () => void;
  onOpenActions: (agent: Agent) => void;
  onCloseActions: () => void;
  onCreateAgent: (formData: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  onConfirmToggle: () => Promise<void>;
  onCancelToggle: () => void;
  onOpenEditCommission: (agent: Agent) => void;
  onCloseEditCommission: () => void;
  onUpdateCommission: (data: UpdateAffiliateRequest) => Promise<void>;
  onOpenViewStats: (agent: Agent) => void;
  onCloseViewStats: () => void;
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
  commissionDrawer,
  statsDrawer,
  onRetry,
  onOpenCreate,
  onCloseModals,
  onDismissSuccess,
  onPageChange,
  onViewTransactions,
  onViewPlayers,
  onOpenEditProfile,
  onConfirmPasswordReset,
  onCancelPasswordReset,
  onUpdateProfile,
  onCloseEditProfile,
  onOpenActions,
  onCloseActions,
  onCreateAgent,
  onConfirmToggle,
  onCancelToggle,
  onOpenEditCommission,
  onCloseEditCommission,
  onUpdateCommission,
  onOpenViewStats,
  onCloseViewStats,
}: AgentsDashboardViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 shrink-0" />
            <div className="flex-1 min-w-0" />
            <Skeleton className="h-9 w-24 sm:w-32 rounded-md shrink-0" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-9 gap-4 px-4 py-3">
                  {[...Array(9)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-9 gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        onEditCommission={() => {
          onCloseActions();
          if (agent) onOpenEditCommission(agent);
        }}
        onViewStats={() => {
          onCloseActions();
          if (agent) onOpenViewStats(agent);
        }}
      />
      <CommissionEditDrawer
        isOpen={commissionDrawer.isOpen}
        agent={commissionDrawer.agent}
        affiliate={commissionDrawer.affiliate}
        isLoading={commissionDrawer.isLoading}
        isUpdating={commissionDrawer.isUpdating}
        onClose={onCloseEditCommission}
        onUpdate={onUpdateCommission}
      />
      <AgentStatsDrawer
        isOpen={statsDrawer.isOpen}
        agent={statsDrawer.agent}
        statsData={statsDrawer.statsData}
        isLoading={statsDrawer.isLoading}
        onClose={onCloseViewStats}
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
  const [commissionDrawer, setCommissionDrawer] = useState<{
    isOpen: boolean;
    agent: Agent | null;
    affiliate: Affiliate | null;
    isLoading: boolean;
    isUpdating: boolean;
  }>({
    isOpen: false,
    agent: null,
    affiliate: null,
    isLoading: false,
    isUpdating: false,
  });
  const [statsDrawer, setStatsDrawer] = useState<{
    isOpen: boolean;
    agent: Agent | null;
    statsData: AgentDashboardResponse | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    agent: null,
    statsData: null,
    isLoading: false,
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
    // Agent may have optional fields from API that aren't in the type definition
    const agentWithOptionalFields = agent as Agent & { full_name?: string; dob?: string };
    setProfileFormData({
      username: agent.username || '',
      full_name: agentWithOptionalFields.full_name || '',
      dob: agentWithOptionalFields.dob || '',
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

  const handleConfirmPasswordReset = useCallback(async (password: string, confirmPassword: string) => {
    if (!passwordResetState.agent) return;

    // Validate passwords match (additional validation beyond component-level)
    if (password !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Password mismatch',
        description: 'Passwords do not match. Please try again.',
      });
      return;
    }

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

    // Validate password if provided
    if (profileFormData.password) {
      // Validate password strength
      const passwordValidation = validatePassword(profileFormData.password);
      if (!passwordValidation.isValid) {
        addToast({
          type: 'error',
          title: 'Invalid password',
          description: passwordValidation.errors[0] || 'Password does not meet requirements.',
        });
        return;
      }

      // Validate passwords match
      if (profileFormData.password !== profileFormData.confirmPassword) {
        addToast({
          type: 'error',
          title: 'Password mismatch',
          description: 'Password and Confirm Password must match.',
        });
        return;
      }
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
      let errorMessage = 'Failed to update profile';
      let errorTitle = 'Update failed';

      // Extract field-specific validation errors from backend
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>;
        
        // Check if error is a direct field error object like {"password": ["error message"]}
        const hasFieldErrors = Object.keys(errorObj).some(key => {
          const value = errorObj[key];
          return (Array.isArray(value) && value.length > 0) || (typeof value === 'string' && value);
        });
        
        if (hasFieldErrors) {
          const errorMessages: string[] = [];
          Object.entries(errorObj).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              errorMessages.push(`${fieldName}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string' && messages) {
              const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              errorMessages.push(`${fieldName}: ${messages}`);
            }
          });
          
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join('; ');
            errorTitle = 'Validation failed';
          }
        } else {
          // Check for errors in nested structure
          const apiError = errorObj as {
            errors?: Record<string, string[]>;
            detail?: string | Record<string, string[]>;
            message?: string;
          };
          
          if (apiError.errors && typeof apiError.errors === 'object') {
            const errorMessages: string[] = [];
            Object.entries(apiError.errors).forEach(([field, messages]) => {
              if (Array.isArray(messages) && messages.length > 0) {
                const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                errorMessages.push(`${fieldName}: ${messages.join(', ')}`);
              }
            });
            if (errorMessages.length > 0) {
              errorMessage = errorMessages.join('; ');
              errorTitle = 'Validation failed';
            }
          } else if (apiError.detail && typeof apiError.detail === 'object' && !Array.isArray(apiError.detail)) {
            const errorMessages: string[] = [];
            Object.entries(apiError.detail as Record<string, unknown>).forEach(([field, messages]) => {
              if (Array.isArray(messages) && messages.length > 0) {
                const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                errorMessages.push(`${fieldName}: ${messages.join(', ')}`);
              } else if (typeof messages === 'string') {
                const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                errorMessages.push(`${fieldName}: ${messages}`);
              }
            });
            if (errorMessages.length > 0) {
              errorMessage = errorMessages.join('; ');
              errorTitle = 'Validation failed';
            }
          } else if (apiError.message) {
            errorMessage = apiError.message;
          } else if (apiError.detail && typeof apiError.detail === 'string') {
            errorMessage = apiError.detail;
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      addToast({
        type: 'error',
        title: errorTitle,
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

  const handleOpenEditCommission = useCallback(async (agent: Agent) => {
    setCommissionDrawer({
      isOpen: true,
      agent,
      affiliate: null,
      isLoading: true,
      isUpdating: false,
    });

    try {
      const affiliatesResponse = await affiliatesApi.list({ search: agent.username, page_size: 100 });
      const affiliate = affiliatesResponse.results.find(
        (aff) => aff.name === agent.username || aff.email === agent.email
      );

      setCommissionDrawer({
        isOpen: true,
        agent,
        affiliate: affiliate || null,
        isLoading: false,
        isUpdating: false,
      });
    } catch (error) {
      console.error('Failed to fetch affiliate data:', error);
      addToast({
        type: 'error',
        title: 'Failed to load commission data',
        description: 'Could not load affiliate commission settings for this agent.',
      });
      setCommissionDrawer({
        isOpen: false,
        agent: null,
        affiliate: null,
        isLoading: false,
        isUpdating: false,
      });
    }
  }, [addToast]);

  const handleCloseEditCommission = useCallback(() => {
    setCommissionDrawer({
      isOpen: false,
      agent: null,
      affiliate: null,
      isLoading: false,
      isUpdating: false,
    });
  }, []);

  const handleUpdateCommission = useCallback(async (data: UpdateAffiliateRequest) => {
    if (!commissionDrawer.affiliate || !commissionDrawer.agent) return;

    setCommissionDrawer((prev) => ({ ...prev, isUpdating: true }));

    try {
      const updatedAffiliate = await affiliatesApi.update(commissionDrawer.affiliate.id, data);
      
      // Update the agent in the table with the new commission data from the response
      if (updatedAffiliate) {
        dashboard.updateAgentCommission(commissionDrawer.agent.id, {
          affiliation_percentage: updatedAffiliate.affiliate_percentage,
          affiliation_fee_percentage: updatedAffiliate.affiliate_fee,
          payment_method_fee_percentage: updatedAffiliate.payment_method_fee,
          affiliate_link: updatedAffiliate.affiliate_link,
        });
      }
      
      addToast({
        type: 'success',
        title: 'Commission updated',
        description: `Commission settings for "${commissionDrawer.agent.username}" have been updated successfully!`,
      });
      setCommissionDrawer({
        isOpen: false,
        agent: null,
        affiliate: null,
        isLoading: false,
        isUpdating: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update commission settings';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage,
      });
      setCommissionDrawer((prev) => ({ ...prev, isUpdating: false }));
      throw error;
    }
  }, [commissionDrawer.affiliate, commissionDrawer.agent, addToast, dashboard]);

  const handleOpenViewStats = useCallback(async (agent: Agent) => {
    setStatsDrawer({
      isOpen: true,
      agent,
      statsData: null,
      isLoading: true,
    });

    try {
      const statsData = await agentsApi.getStats(agent.id);
      setStatsDrawer({
        isOpen: true,
        agent,
        statsData,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
      addToast({
        type: 'error',
        title: 'Failed to load stats',
        description: 'Could not load agent statistics.',
      });
      setStatsDrawer({
        isOpen: false,
        agent: null,
        statsData: null,
        isLoading: false,
      });
    }
  }, [addToast]);

  const handleCloseViewStats = useCallback(() => {
    setStatsDrawer({
      isOpen: false,
      agent: null,
      statsData: null,
      isLoading: false,
    });
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
      onConfirmPasswordReset={handleConfirmPasswordReset}
      onCancelPasswordReset={handleCancelPasswordReset}
      onUpdateProfile={handleUpdateProfile}
      onCloseEditProfile={handleCloseEditProfile}
      onOpenActions={handleOpenActions}
      onCloseActions={handleCloseActions}
      onCreateAgent={dashboard.handleCreateAgent}
      onConfirmToggle={dashboard.confirmToggle}
      onCancelToggle={dashboard.cancelToggle}
      commissionDrawer={commissionDrawer}
      statsDrawer={statsDrawer}
      onOpenEditCommission={handleOpenEditCommission}
      onCloseEditCommission={handleCloseEditCommission}
      onUpdateCommission={handleUpdateCommission}
      onOpenViewStats={handleOpenViewStats}
      onCloseViewStats={handleCloseViewStats}
    />
  );
}
