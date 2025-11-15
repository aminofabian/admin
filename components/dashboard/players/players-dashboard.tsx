'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { playersApi, agentsApi } from '@/lib/api';
import { usePagination } from '@/lib/hooks';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmModal,
  Drawer,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@/components/ui';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PlayerForm,
} from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type {
  Agent,
  CreatePlayerRequest,
  PaginatedResponse,
  Player,
  UpdateUserRequest,
} from '@/types';

type FilterState = {
  username: string;
  full_name: string;
  email: string;
  agent: string;
  agent_id: string;
};

type ModalState = {
  confirm: {
    isLoading: boolean;
    isOpen: boolean;
    player: Player | null;
  };
  isCreateOpen: boolean;
  isSubmitting: boolean;
  submitError: string;
  successMessage: string;
};

type PlayersDataState = {
  data: PaginatedResponse<Player> | null;
  error: string;
  isLoading: boolean;
};

type PlayersPageContext = {
  creationHandlers: ReturnType<typeof usePlayerCreation>;
  dataState: ReturnType<typeof usePlayersData>;
  filters: ReturnType<typeof usePlayerFilters>;
  modalState: ReturnType<typeof usePlayerModals>;
  pagination: ReturnType<typeof usePagination>;
  router: ReturnType<typeof useRouter>;
  statusHandlers: ReturnType<typeof usePlayerStatusActions>;
  agentOptions: Array<{ value: string; label: string }>;
  isAgentLoading: boolean;
};

export default function PlayersDashboard(): ReactElement {
  const {
    creationHandlers,
    dataState,
    filters,
    modalState,
    pagination,
    router,
    statusHandlers,
    agentOptions,
    isAgentLoading,
  } = usePlayersPageContext();

  if (dataState.shouldShowLoading) {
    return <LoadingState />;
  }

  if (dataState.shouldShowError) {
    return (
      <ErrorState
        message={dataState.error}
        onRetry={dataState.refresh}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PlayersHeader onAddPlayer={modalState.openCreateModal} />
      <PlayersFilters
        filters={filters.values}
        onFilterChange={filters.setFilter}
        onApplyFilters={filters.applyFilters}
        onClearFilters={filters.clearFilters}
        successMessage={modalState.state.successMessage}
        onDismissSuccess={modalState.clearSuccessMessage}
        agentOptions={agentOptions}
        isAgentLoading={isAgentLoading}
        isLoading={dataState.isLoading}
      />
      <PlayersTableSection
        data={dataState.data}
        hasActiveFilters={filters.hasActiveFilters}
        onOpenChat={(player) => {
          const chatUrl = `/dashboard/chat?playerId=${player.id}&username=${encodeURIComponent(player.username)}`;
          router.push(chatUrl);
        }}
        onPageChange={pagination.setPage}
        onViewPlayer={(player) => router.push(`/dashboard/players/${player.id}`)}
        onToggleStatus={statusHandlers.openConfirm}
        page={pagination.page}
        pageSize={pagination.pageSize}
      />
      <CreatePlayerDrawer
        isOpen={modalState.state.isCreateOpen}
        isSubmitting={modalState.state.isSubmitting}
        onClose={modalState.closeCreateModal}
        onSubmit={creationHandlers.handleSubmit}
        submitError={modalState.state.submitError}
      />
      <ConfirmModal
        isOpen={modalState.state.confirm.isOpen}
        onClose={modalState.cancelConfirm}
        onConfirm={statusHandlers.confirmToggle}
        title={`${modalState.state.confirm.player?.is_active ? 'Deactivate' : 'Activate'} Player`}
        description={`Are you sure you want to ${modalState.state.confirm.player?.is_active ? 'deactivate' : 'activate'} "${modalState.state.confirm.player?.username}"?`}
        confirmText={modalState.state.confirm.player?.is_active ? 'Deactivate' : 'Activate'}
        variant={modalState.state.confirm.player?.is_active ? 'warning' : 'info'}
        isLoading={modalState.state.confirm.isLoading}
      />
    </div>
  );
}

function usePlayersPageContext(): PlayersPageContext {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pagination = usePagination();
  const modalState = usePlayerModals();
  const toast = useToast();
  
  // Read agent_id from URL params
  const agentIdFromUrl = searchParams.get('agent_id');
  
  // Load agents for filter dropdown
  const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [agentIdMap, setAgentIdMap] = useState<Map<string, number>>(new Map());
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  // Initialize filters with agentIdMap and pagination (must be before useEffect that uses it)
  const filters = usePlayerFilters(agentIdMap, pagination.setPage);

  useEffect(() => {
    let isMounted = true;

    const loadAgents = async () => {
      setIsAgentLoading(true);

      try {
        const aggregated: Agent[] = [];
        const pageSize = 100;
        let page = 1;
        let hasNext = true;

        while (hasNext) {
          const response = await agentsApi.list({ page, page_size: pageSize });

          if (!response?.results) {
            break;
          }

          aggregated.push(...response.results);

          if (!response.next) {
            hasNext = false;
          } else {
            page += 1;
          }

          if (!hasNext) {
            break;
          }
        }

        if (!isMounted) {
          return;
        }

        const uniqueAgents = new Map<string, string>();
        const idMap = new Map<string, number>();

        aggregated.forEach((agent) => {
          if (agent?.username) {
            uniqueAgents.set(agent.username, agent.username);
            idMap.set(agent.username, agent.id);
          }
        });

        const mappedOptions = Array.from(uniqueAgents.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

        setAgentOptions(mappedOptions);
        setAgentIdMap(idMap);
      } catch (error) {
        console.error('Failed to load agents for player filters:', error);
      } finally {
        if (isMounted) {
          setIsAgentLoading(false);
        }
      }
    };

    loadAgents();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync agent filter with agent_id mapping
  useEffect(() => {
    if (agentIdMap.size > 0) {
      if (filters.values.agent) {
        const agentId = agentIdMap.get(filters.values.agent);
        if (agentId && filters.values.agent_id !== String(agentId)) {
          filters.setFilter('agent_id', String(agentId));
        } else if (!agentId) {
          // Agent not found in map, clear agent_id
          filters.setFilter('agent_id', '');
        }
      } else {
        // Agent cleared, clear agent_id
        if (filters.values.agent_id) {
          filters.setFilter('agent_id', '');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.values.agent, filters.values.agent_id, agentIdMap, filters.setFilter]);
  
  const dataState = usePlayersData({
    filters: filters.appliedFilters,
    pagination,
    agentId: agentIdFromUrl ? parseInt(agentIdFromUrl, 10) : (filters.appliedFilters.agent_id ? parseInt(filters.appliedFilters.agent_id, 10) : undefined),
  });
  const statusHandlers = usePlayerStatusActions({
    addToast: toast.addToast,
    cancelConfirm: modalState.cancelConfirm,
    confirmState: modalState.state.confirm,
    openConfirm: modalState.openConfirm,
    refresh: dataState.refresh,
    setConfirmLoading: modalState.setConfirmLoading,
  });
  const creationHandlers = usePlayerCreation({
    closeCreateModal: modalState.closeCreateModal,
    refresh: dataState.refresh,
    setSubmitting: modalState.setSubmitting,
    setSubmitError: modalState.setSubmitError,
    setSuccessMessage: modalState.setSuccessMessage,
  });

  useSuccessMessageTimer(
    modalState.state.successMessage,
    modalState.clearSuccessMessage,
  );

  return {
    creationHandlers,
    dataState,
    filters,
    modalState,
    pagination,
    router,
    statusHandlers,
    agentOptions,
    isAgentLoading,
  };
}

function usePlayersData({
  filters,
  pagination,
  agentId,
}: {
  filters: FilterState;
  pagination: ReturnType<typeof usePagination>;
  agentId?: number;
}): {
  data: PaginatedResponse<Player> | null;
  error: string;
  isLoading: boolean;
  refresh: () => Promise<void>;
  shouldShowError: boolean;
  shouldShowLoading: boolean;
} {
  const [state, setState] = useState<PlayersDataState>({
    data: null,
    error: '',
    isLoading: true,
  });

  const loadPlayers = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: '' }));
      const params: Record<string, string | number | boolean | undefined> = {
        page: pagination.page,
        page_size: pagination.pageSize,
      };

      // Add username, full_name, email params if they have values
      if (filters.username.trim()) {
        params.username = filters.username.trim();
      }
      if (filters.full_name.trim()) {
        params.full_name = filters.full_name.trim();
      }
      if (filters.email.trim()) {
        params.email = filters.email.trim();
      }
      
      // Add agent_id if provided (from URL params or filter)
      const effectiveAgentId = agentId || (filters.agent_id ? parseInt(filters.agent_id, 10) : undefined);
      if (effectiveAgentId && !isNaN(effectiveAgentId)) {
        params.agent_id = effectiveAgentId;
      }

      const response = await playersApi.list(params);
      setState({ data: response, error: '', isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load players';
      setState((prev) => ({ ...prev, error: message, isLoading: false }));
    }
  }, [
    filters.username,
    filters.full_name,
    filters.email,
    filters.agent_id,
    agentId,
    pagination.page,
    pagination.pageSize,
  ]);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    refresh: loadPlayers,
    shouldShowError: !!state.error && !state.data,
    shouldShowLoading: state.isLoading && !state.data,
  };
}

function usePlayerFilters(
  agentIdMap: Map<string, number>,
  setPage: (page: number) => void,
): {
  applyFilters: () => void;
  clearFilters: () => void;
  setFilter: (key: keyof FilterState, value: string) => void;
  appliedFilters: FilterState;
  values: FilterState;
  hasActiveFilters: boolean;
} {
  const [filters, setFilters] = useState<FilterState>({
    username: '',
    full_name: '',
    email: '',
    agent: '',
    agent_id: '',
  });

  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    username: '',
    full_name: '',
    email: '',
    agent: '',
    agent_id: '',
  });

  const setFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    // Ensure agent_id is synced before applying filters
    const filtersToApply = { ...filters };
    
    if (filtersToApply.agent && agentIdMap.size > 0) {
      const agentId = agentIdMap.get(filtersToApply.agent);
      if (agentId) {
        filtersToApply.agent_id = String(agentId);
      } else {
        filtersToApply.agent_id = '';
      }
    } else if (!filtersToApply.agent) {
      filtersToApply.agent_id = '';
    }
    
    setAppliedFilters(filtersToApply);
    // Reset to page 1 when filters are applied
    setPage(1);
  }, [filters, agentIdMap, setPage]);

  const clearFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      username: '',
      full_name: '',
      email: '',
      agent: '',
      agent_id: '',
    };
    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      appliedFilters.username.trim() !== '' ||
      appliedFilters.full_name.trim() !== '' ||
      appliedFilters.email.trim() !== '' ||
      appliedFilters.agent.trim() !== '' ||
      appliedFilters.agent_id.trim() !== ''
    );
  }, [appliedFilters]);

  return {
    applyFilters,
    clearFilters,
    setFilter,
    appliedFilters,
    values: filters,
    hasActiveFilters,
  };
}

function usePlayerModals(): {
  cancelConfirm: () => void;
  clearSuccessMessage: () => void;
  closeCreateModal: () => void;
  openConfirm: (player: Player) => void;
  openCreateModal: () => void;
  setConfirmLoading: (isLoading: boolean) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setSubmitError: (message: string) => void;
  setSuccessMessage: (message: string) => void;
  state: ModalState;
} {
  const initialState: ModalState = useMemo(
    () => ({
      confirm: {
        isLoading: false,
        isOpen: false,
        player: null,
      },
      isCreateOpen: false,
      isSubmitting: false,
      submitError: '',
      successMessage: '',
    }),
    [],
  );

  const [state, setState] = useState<ModalState>(initialState);

  const openCreateModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCreateOpen: true,
      submitError: '',
    }));
  }, []);

  const closeCreateModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCreateOpen: false,
      submitError: '',
    }));
  }, []);

  const openConfirm = useCallback((player: Player) => {
    setState((prev) => ({
      ...prev,
      confirm: { isLoading: false, isOpen: true, player },
    }));
  }, []);

  const cancelConfirm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      confirm: { ...prev.confirm, isOpen: false, player: null, isLoading: false },
    }));
  }, []);

  const setConfirmLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({
      ...prev,
      confirm: { ...prev.confirm, isLoading },
    }));
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState((prev) => ({ ...prev, isSubmitting }));
  }, []);

  const setSubmitError = useCallback((message: string) => {
    setState((prev) => ({ ...prev, submitError: message }));
  }, []);

  const setSuccessMessage = useCallback((message: string) => {
    setState((prev) => ({ ...prev, successMessage: message }));
  }, []);

  const clearSuccessMessage = useCallback(() => {
    setState((prev) => ({ ...prev, successMessage: '' }));
  }, []);

  return {
    cancelConfirm,
    clearSuccessMessage,
    closeCreateModal,
    openConfirm,
    openCreateModal,
    setConfirmLoading,
    setSubmitting,
    setSubmitError,
    setSuccessMessage,
    state,
  };
}

function usePlayerStatusActions({
  addToast,
  cancelConfirm,
  confirmState,
  openConfirm,
  refresh,
  setConfirmLoading,
}: {
  addToast: ReturnType<typeof useToast>['addToast'];
  cancelConfirm: () => void;
  confirmState: ModalState['confirm'];
  openConfirm: (player: Player) => void;
  refresh: () => Promise<void>;
  setConfirmLoading: (isLoading: boolean) => void;
}): {
  confirmToggle: () => Promise<void>;
  openConfirm: (player: Player) => void;
} {
  const handleOpenConfirm = useCallback(
    (player: Player) => {
      openConfirm(player);
    },
    [openConfirm],
  );

  const confirmToggle = useCallback(async () => {
    const targetPlayer = confirmState.player;
    if (!targetPlayer) {
      return;
    }

    setConfirmLoading(true);

    try {
      const actionPast = targetPlayer.is_active ? 'deactivated' : 'activated';
      await playersApi.update(targetPlayer.id, {
        is_active: !targetPlayer.is_active,
      });

      addToast({
        type: 'success',
        title: 'Player updated',
        description: `"${targetPlayer.username}" has been ${actionPast} successfully!`,
      });

      cancelConfirm();
      await refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update player status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
      setConfirmLoading(false);
    }
  }, [addToast, cancelConfirm, confirmState, refresh, setConfirmLoading]);

  return { confirmToggle, openConfirm: handleOpenConfirm };
}

function usePlayerCreation({
  closeCreateModal,
  refresh,
  setSubmitting,
  setSubmitError,
  setSuccessMessage,
}: {
  closeCreateModal: () => void;
  refresh: () => Promise<void>;
  setSubmitting: (isSubmitting: boolean) => void;
  setSubmitError: (message: string) => void;
  setSuccessMessage: (message: string) => void;
}): {
  handleSubmit: (
    data: CreatePlayerRequest | UpdateUserRequest,
  ) => Promise<void>;
} {
  const handleSubmit = useCallback(
    async (formData: CreatePlayerRequest | UpdateUserRequest) => {
      try {
        setSubmitting(true);
        setSubmitError('');

        await playersApi.create(formData as CreatePlayerRequest);

        setSuccessMessage('Player created successfully!');
        closeCreateModal();
        await refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create player';
        setSubmitError(message);
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [closeCreateModal, refresh, setSubmitting, setSubmitError, setSuccessMessage],
  );

  return { handleSubmit };
}

function useSuccessMessageTimer(
  successMessage: string,
  clear: () => void,
): void {
  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      clear();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [clear, successMessage]);
}


function PlayersHeader({ onAddPlayer }: { onAddPlayer: () => void }): ReactElement {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Players
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage player accounts and their balances
          </p>
        </div>
        <Button onClick={onAddPlayer}>
          <svg
            className="mr-2 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Player
        </Button>
      </CardContent>
    </Card>
  );
}

type PlayersFiltersProps = {
  filters: FilterState;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onDismissSuccess: () => void;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  successMessage: string;
  agentOptions: Array<{ value: string; label: string }>;
  isAgentLoading: boolean;
  isLoading: boolean;
};

function PlayersFilters({
  filters,
  onApplyFilters,
  onClearFilters,
  onDismissSuccess,
  onFilterChange,
  successMessage,
  agentOptions,
  isAgentLoading,
  isLoading,
}: PlayersFiltersProps): ReactElement {
  const inputClasses =
    'w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 shadow-sm transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-500/30';

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {successMessage && (
          <SuccessBanner message={successMessage} onDismiss={onDismissSuccess} />
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Username
            </label>
            <input
              type="text"
              value={filters.username}
              onChange={(event) => onFilterChange('username', event.target.value)}
              placeholder="Filter by username"
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name
            </label>
            <input
              type="text"
              value={filters.full_name}
              onChange={(event) => onFilterChange('full_name', event.target.value)}
              placeholder="Filter by full name"
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={filters.email}
              onChange={(event) => onFilterChange('email', event.target.value)}
              placeholder="Filter by email"
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Agent
            </label>
            <Select
              value={filters.agent}
              onChange={(value: string) => onFilterChange('agent', value)}
              options={[
                { value: '', label: 'All Agents' },
                ...(agentOptions || []),
                ...(filters.agent && agentOptions && !agentOptions.some((option) => option.value === filters.agent)
                  ? [{ value: filters.agent, label: filters.agent }]
                  : []),
              ]}
              placeholder="All Agents"
              isLoading={isAgentLoading}
              disabled={isAgentLoading}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            disabled={isLoading}
          >
            Clear Filters
          </Button>
          <Button 
            size="sm" 
            onClick={onApplyFilters}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Applying...' : 'Apply Filters'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SuccessBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}): ReactElement {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300 sm:flex sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>{message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="mt-3 inline-flex items-center text-sm font-medium text-green-600 transition-colors hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 sm:mt-0"
      >
        Dismiss
      </button>
    </div>
  );
}


type PlayersTableSectionProps = {
  data: PaginatedResponse<Player> | null;
  hasActiveFilters: boolean;
  onOpenChat: (player: Player) => void;
  onPageChange: (page: number) => void;
  onToggleStatus: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  page: number;
  pageSize: number;
};

function PlayersTableSection({
  data,
  hasActiveFilters,
  onOpenChat,
  onPageChange,
  onToggleStatus,
  onViewPlayer,
  page,
  pageSize,
}: PlayersTableSectionProps): ReactElement {
  const shouldShowEmpty = data !== null && data.results.length === 0;
  const showPagination = !!data && data.count > pageSize;

  return (
    <Card>
      <CardContent className="p-0">
        {shouldShowEmpty ? (
          <div className="py-12">
            <EmptyState
              title={hasActiveFilters ? 'No players match your filters' : 'No players found'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search criteria or clear the filters to see all players'
                  : 'Get started by creating a new player'
              }
            />
          </div>
        ) : (
          <>
            <PlayersTable
              players={data?.results ?? []}
              onOpenChat={onOpenChat}
              onToggleStatus={onToggleStatus}
              onViewPlayer={onViewPlayer}
            />
            {showPagination && (
              <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil((data?.count ?? 0) / pageSize)}
                  onPageChange={onPageChange}
                  hasNext={Boolean(data?.next)}
                  hasPrevious={Boolean(data?.previous)}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

type PlayersTableProps = {
  onOpenChat: (player: Player) => void;
  onToggleStatus: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  players: Player[];
};

function PlayersTable({
  onOpenChat,
  onToggleStatus,
  onViewPlayer,
  players,
}: PlayersTableProps): ReactElement {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Credit</TableHead>
            <TableHead>Winning</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <PlayersTableRow
              key={player.id}
              player={player}
              onOpenChat={onOpenChat}
              onToggleStatus={onToggleStatus}
              onViewPlayer={onViewPlayer}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type PlayersTableRowProps = {
  onOpenChat: (player: Player) => void;
  onToggleStatus: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  player: Player;
};

function PlayersTableRow({
  onOpenChat,
  onToggleStatus,
  onViewPlayer,
  player,
}: PlayersTableRowProps): ReactElement {
  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <button
          type="button"
          onClick={() => onOpenChat(player)}
          className="flex w-full items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:hover:bg-gray-800"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
            {player.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {player.username}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {player.full_name}
            </div>
          </div>
        </button>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {player.email}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {(() => {
            if (player.agent_username) return player.agent_username;
            if (player.agent && typeof player.agent === 'object' && 'username' in player.agent) {
              return player.agent.username;
            }
            return '-';
          })()}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {formatCurrency(player.balance)}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(player.winning_balance)}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={player.is_active ? 'success' : 'danger'}>
          {player.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(player.created)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onViewPlayer(player)}
            title="View"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </Button>
          <Button
            size="sm"
            variant={player.is_active ? 'danger' : 'primary'}
            onClick={() => onToggleStatus(player)}
            title={player.is_active ? 'Deactivate' : 'Activate'}
          >
            {player.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

type CreatePlayerDrawerProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlayerRequest | UpdateUserRequest) => Promise<void>;
  submitError: string;
};

function CreatePlayerDrawer({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  submitError,
}: CreatePlayerDrawerProps): ReactElement {
  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create New Player" 
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-player-form"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Player
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Error creating player</p>
              <p className="text-sm mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Player Account Information
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                All fields marked with * are required. The player will be able to log in immediately after creation.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <PlayerForm
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isSubmitting}
        />
      </div>
    </Drawer>
  );
}

