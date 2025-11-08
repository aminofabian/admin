'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { playersApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PlayerForm,
} from '@/components/features';
import { PlayerViewModal } from '@/components/dashboard/data-sections/action-modal/player-view-modal';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type {
  CreatePlayerRequest,
  PaginatedResponse,
  Player,
  UpdateUserRequest,
} from '@/types';

type FilterState = {
  date: string;
  state: string;
  status: string;
};

type ModalState = {
  confirm: {
    isLoading: boolean;
    isOpen: boolean;
    player: Player | null;
  };
  isCreateOpen: boolean;
  isSubmitting: boolean;
  isViewOpen: boolean;
  selectedPlayer: Player | null;
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
  searchState: ReturnType<typeof useSearch>;
  statusHandlers: ReturnType<typeof usePlayerStatusActions>;
};

export default function PlayersDashboard(): ReactElement {
  const {
    creationHandlers,
    dataState,
    filters,
    modalState,
    pagination,
    router,
    searchState,
    statusHandlers,
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
        onSearchChange={searchState.setSearch}
        search={searchState.search}
        successMessage={modalState.state.successMessage}
        onDismissSuccess={modalState.clearSuccessMessage}
      />
      <PlayersTableSection
        data={dataState.data}
        onOpenChat={(player) => {
          const chatUrl = `/dashboard/chat?playerId=${player.id}&username=${encodeURIComponent(player.username)}`;
          router.push(chatUrl);
        }}
        onPageChange={pagination.setPage}
        onViewPlayer={modalState.openViewModal}
        onToggleStatus={statusHandlers.openConfirm}
        page={pagination.page}
        pageSize={pagination.pageSize}
      />
      <CreatePlayerModal
        isOpen={modalState.state.isCreateOpen}
        isSubmitting={modalState.state.isSubmitting}
        onClose={modalState.closeCreateModal}
        onSubmit={creationHandlers.handleSubmit}
        submitError={modalState.state.submitError}
      />
      <PlayerViewModal
        isOpen={modalState.state.isViewOpen}
        onClose={modalState.closeViewModal}
        player={modalState.state.selectedPlayer}
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
  const pagination = usePagination();
  const searchState = useSearch();
  const filters = usePlayerFilters();
  const modalState = usePlayerModals();
  const toast = useToast();
  const dataState = usePlayersData({
    filters: filters.values,
    pagination,
    search: searchState.debouncedSearch,
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
    searchState,
    statusHandlers,
  };
}

function usePlayersData({
  filters,
  pagination,
  search,
}: {
  filters: FilterState;
  pagination: ReturnType<typeof usePagination>;
  search: string;
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
      const response = await playersApi.list({
        page: pagination.page,
        page_size: pagination.pageSize,
        search: search || undefined,
        is_active:
          filters.status === 'all' ? undefined : filters.status === 'active',
        state: filters.state === 'all' ? undefined : filters.state,
        date_filter: filters.date === 'all' ? undefined : filters.date,
      });
      setState({ data: response, error: '', isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load players';
      setState((prev) => ({ ...prev, error: message, isLoading: false }));
    }
  }, [
    filters.date,
    filters.state,
    filters.status,
    pagination.page,
    pagination.pageSize,
    search,
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

function usePlayerFilters(): {
  setFilter: (key: keyof FilterState, value: string) => void;
  values: FilterState;
} {
  const [filters, setFilters] = useState<FilterState>({
    date: 'all',
    state: 'all',
    status: 'all',
  });

  const setFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { setFilter, values: filters };
}

function usePlayerModals(): {
  cancelConfirm: () => void;
  clearSuccessMessage: () => void;
  closeCreateModal: () => void;
  closeViewModal: () => void;
  openConfirm: (player: Player) => void;
  openCreateModal: () => void;
  openViewModal: (player: Player) => void;
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
      isViewOpen: false,
      selectedPlayer: null,
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

  const openViewModal = useCallback((player: Player) => {
    setState((prev) => ({
      ...prev,
      isViewOpen: true,
      selectedPlayer: player,
    }));
  }, []);

  const closeCreateModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCreateOpen: false,
      submitError: '',
    }));
  }, []);

  const closeViewModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isViewOpen: false,
      selectedPlayer: null,
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
    closeViewModal,
    openConfirm,
    openCreateModal,
    openViewModal,
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

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
] as const;

const STATE_OPTIONS = [
  { label: 'All States', value: 'all' },
  { label: 'California', value: 'CA' },
  { label: 'New York', value: 'NY' },
  { label: 'Texas', value: 'TX' },
  { label: 'Florida', value: 'FL' },
] as const;

const DATE_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
] as const;

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
  onDismissSuccess: () => void;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearchChange: (value: string) => void;
  search: string;
  successMessage: string;
};

function PlayersFilters({
  filters,
  onDismissSuccess,
  onFilterChange,
  onSearchChange,
  search,
  successMessage,
}: PlayersFiltersProps): ReactElement {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {successMessage && (
          <SuccessBanner message={successMessage} onDismiss={onDismissSuccess} />
        )}
        <div className="w-full">
          <SearchInput
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by username, full name, or email..."
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <FilterSelect
            label="Status"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(value) => onFilterChange('status', value)}
          />
          <FilterSelect
            label="State"
            options={STATE_OPTIONS}
            value={filters.state}
            onChange={(value) => onFilterChange('state', value)}
          />
          <FilterSelect
            label="Date"
            options={DATE_OPTIONS}
            value={filters.date}
            onChange={(value) => onFilterChange('date', value)}
          />
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

type FilterSelectProps = {
  label: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
};

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: FilterSelectProps): ReactElement {
  return (
    <div className="min-w-[160px] flex-1 sm:flex-none">
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type PlayersTableSectionProps = {
  data: PaginatedResponse<Player> | null;
  onOpenChat: (player: Player) => void;
  onPageChange: (page: number) => void;
  onToggleStatus: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  page: number;
  pageSize: number;
};

function PlayersTableSection({
  data,
  onOpenChat,
  onPageChange,
  onToggleStatus,
  onViewPlayer,
  page,
  pageSize,
}: PlayersTableSectionProps): ReactElement {
  const shouldShowEmpty = data?.results.length === 0;
  const showPagination = !!data && data.count > pageSize;

  return (
    <Card>
      <CardContent className="p-0">
        {shouldShowEmpty ? (
          <div className="py-12">
            <EmptyState
              title="No players found"
              description="Get started by creating a new player"
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

type CreatePlayerModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlayerRequest | UpdateUserRequest) => Promise<void>;
  submitError: string;
};

function CreatePlayerModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  submitError,
}: CreatePlayerModalProps): ReactElement {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Player" size="md">
      {submitError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
          {submitError}
        </div>
      )}
      <PlayerForm
        onSubmit={onSubmit}
        onCancel={onClose}
        isLoading={isSubmitting}
      />
    </Modal>
  );
}

