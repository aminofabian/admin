'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { playersApi, agentsApi } from '@/lib/api';
import { usePagination } from '@/lib/hooks';
import {
  Badge,
  Button,
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
import { useTheme } from '@/providers/theme-provider';
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

// All 50 US States
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

type FilterState = {
  username: string;
  full_name: string;
  email: string;
  agent: string;
  date_from: string;
  date_to: string;
  status: string;
  state: string;
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
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <PlayersHeader 
        onAddPlayer={modalState.openCreateModal}
        totalCount={dataState.data?.count ?? 0}
      />
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
    </div>
  );
}

function usePlayersPageContext(): PlayersPageContext {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pagination = usePagination();
  
  // Read agent username from URL params
  const agentFromUrl = searchParams.get('agent');
  
  // Load agents for filter dropdown
  const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  // Initialize filters with pagination and initial agent from URL (if present)
  const filters = usePlayerFilters(pagination.setPage, agentFromUrl || undefined);
  
  // Log when agent is initialized from URL
  useEffect(() => {
    if (agentFromUrl && filters.appliedFilters.agent === agentFromUrl) {
      console.log('✅ Agent filter initialized from URL:', agentFromUrl);
    }
  }, [agentFromUrl, filters.appliedFilters.agent]);

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

        aggregated.forEach((agent) => {
          if (agent?.username) {
            uniqueAgents.set(agent.username, agent.username);
          }
        });

        const mappedOptions = Array.from(uniqueAgents.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

        setAgentOptions(mappedOptions);
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

  // Remove URL parameter after component has mounted (if agent was in URL)
  // This prevents it from overriding filter changes
  useEffect(() => {
    if (agentFromUrl) {
      // Use setTimeout to ensure state has been committed before updating URL
      const timeoutId = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete('agent');
        const newSearch = params.toString();
        const newUrl = newSearch 
          ? `${pathname}?${newSearch}`
          : pathname;
        // Use window.history.replaceState to avoid triggering a navigation/reload
        window.history.replaceState({}, '', newUrl);
      }, 100); // Small delay to ensure filter state is initialized
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFromUrl, pathname]);
  
  const dataState = usePlayersData({
    filters: filters.appliedFilters,
    pagination,
  });
  const modalState = usePlayerModals(dataState.refresh);
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
    agentOptions,
    isAgentLoading,
  };
}

function usePlayersData({
  filters,
  pagination,
}: {
  filters: FilterState;
  pagination: ReturnType<typeof usePagination>;
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
      
      // Add agent (username) if provided from filter
      if (filters.agent.trim()) {
        params.agent = filters.agent.trim();
        console.log('🔍 Loading players with agent filter:', params.agent);
      } else {
        console.log('🔍 Loading players without agent filter');
      }

      // Add date filters if provided (backend expects date_from/date_to in YYYY-MM-DD format)
      if (filters.date_from && filters.date_from.trim()) {
        const dateStr = filters.date_from.trim();
        // Ensure date is in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          params.date_from = dateStr;
        } else {
          // Try to parse and reformat if needed
          try {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              params.date_from = parsedDate.toISOString().split('T')[0];
            }
          } catch (error) {
            console.error('Error parsing date_from:', error);
          }
        }
      }
      if (filters.date_to && filters.date_to.trim()) {
        const dateStr = filters.date_to.trim();
        // Ensure date is in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          params.date_to = dateStr;
        } else {
          // Try to parse and reformat if needed
          try {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              params.date_to = parsedDate.toISOString().split('T')[0];
            }
          } catch (error) {
            console.error('Error parsing date_to:', error);
          }
        }
      }

      // Add status filter if provided
      if (filters.status.trim() && filters.status !== 'all') {
        params.status = filters.status.trim();
      }

      // Add state filter if provided
      if (filters.state.trim() && filters.state !== 'all') {
        params.state = filters.state.trim();
      }

      // Log the final params to verify date format
      console.log('🔍 Sending API request with params:', params);
      
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
    filters.agent,
    filters.date_from,
    filters.date_to,
    filters.status,
    filters.state,
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
  setPage: (page: number) => void,
  initialAgent?: string,
): {
  applyFilters: () => void;
  clearFilters: () => void;
  setFilter: (key: keyof FilterState, value: string) => void;
  setFilterAndApply: (key: keyof FilterState, value: string) => void;
  appliedFilters: FilterState;
  values: FilterState;
  hasActiveFilters: boolean;
} {
  const [filters, setFilters] = useState<FilterState>({
    username: '',
    full_name: '',
    email: '',
    agent: initialAgent || '',
    date_from: '',
    date_to: '',
    status: 'all',
    state: 'all',
  });

  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    username: '',
    full_name: '',
    email: '',
    agent: initialAgent || '',
    date_from: '',
    date_to: '',
    status: 'all',
    state: 'all',
  });

  const setFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    // Reset to page 1 when filters are applied
    setPage(1);
  }, [filters, setPage]);

  const clearFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      username: '',
      full_name: '',
      email: '',
      agent: '',
      date_from: '',
      date_to: '',
      status: 'all',
      state: 'all',
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
      appliedFilters.date_from.trim() !== '' ||
      appliedFilters.date_to.trim() !== '' ||
      (appliedFilters.status.trim() !== '' && appliedFilters.status !== 'all') ||
      (appliedFilters.state.trim() !== '' && appliedFilters.state !== 'all')
    );
  }, [appliedFilters]);

  const setFilterAndApply = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters, [key]: value };
      // Update appliedFilters with the new value immediately
      setAppliedFilters(updatedFilters);
      setPage(1);
      console.log('✅ Filter set and applied:', key, '=', value, 'Updated filters:', updatedFilters);
      return updatedFilters;
    });
  }, [setPage]);

  return {
    applyFilters,
    clearFilters,
    setFilter,
    setFilterAndApply,
    appliedFilters,
    values: filters,
    hasActiveFilters,
  };
}

function usePlayerModals(refresh: () => Promise<void>): {
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
  const toast = useToast();
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


function PlayersHeader({ 
  onAddPlayer,
  totalCount,
}: { 
  onAddPlayer: () => void;
  totalCount: number;
}): ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
      {/* Single compact row - everything in one line */}
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
        {/* Icon */}
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        
        {/* Title */}
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
          Players
        </h2>
        
        {/* Spacer */}
        <div className="flex-1 min-w-0" />
        
        {/* Add button - compact */}
        <Button 
          variant="primary" 
          size="sm" 
          onClick={onAddPlayer}
          className="shadow-md transition-all hover:shadow-lg touch-manipulation px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 shrink-0"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden md:inline ml-1.5">Add Player</span>
        </Button>
      </div>
    </div>
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

const FILTER_ICON = (
  <svg className="w-5 h-5 text-muted-foreground transition-colors dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="filterIconGradient" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" />
      </linearGradient>
    </defs>
    <path stroke="url(#filterIconGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

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
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  
  const inputClasses =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
  const labelClasses =
    'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300';

  return (
    <>
      {successMessage && (
        <div className="mb-4">
          <SuccessBanner message={successMessage} onDismiss={onDismissSuccess} />
        </div>
      )}
      
      <div className="rounded-2xl border border-border bg-card p-5 shadow-md shadow-black/5 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-900/40">
        <div className="flex items-center justify-between text-foreground">
          <h3 className="flex items-center gap-3 text-base font-semibold text-foreground transition-colors">
            {FILTER_ICON}
            Filters
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground dark:hover:bg-slate-800/70"
          >
            {isOpen ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Hide Filters
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show Filters
              </>
            )}
          </Button>
        </div>

        {isOpen && (
          <div className="pt-5 text-foreground transition-colors">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
              {/* Player Username */}
              <div className="min-w-0">
                <label className={labelClasses}>Player Username</label>
                <input
                  type="text"
                  value={filters.username}
                  onChange={(event) => onFilterChange('username', event.target.value)}
                  placeholder="Enter username..."
                  className={inputClasses}
                />
              </div>

              {/* Full Name */}
              <div className="min-w-0">
                <label className={labelClasses}>Full Name</label>
                <input
                  type="text"
                  value={filters.full_name}
                  onChange={(event) => onFilterChange('full_name', event.target.value)}
                  placeholder="Enter full name..."
                  className={inputClasses}
                />
              </div>

              {/* Email */}
              <div className="min-w-0">
                <label className={labelClasses}>Email</label>
                <input
                  type="email"
                  value={filters.email}
                  onChange={(event) => onFilterChange('email', event.target.value)}
                  placeholder="Filter by email"
                  className={inputClasses}
                />
              </div>

              {/* Agent */}
              <div className="min-w-0">
                <label className={labelClasses}>Agent</label>
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

              {/* Status */}
              <div className="min-w-0">
                <label className={labelClasses}>Status</label>
                <Select
                  value={filters.status}
                  onChange={(value: string) => onFilterChange('status', value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  placeholder="All Statuses"
                />
              </div>

              {/* State */}
              <div className="min-w-0">
                <label className={labelClasses}>State</label>
                <Select
                  value={filters.state}
                  onChange={(value: string) => onFilterChange('state', value)}
                  options={[
                    { value: 'all', label: 'All States' },
                    ...US_STATES,
                  ]}
                  placeholder="All States"
                />
              </div>

              {/* From Date */}
              <div className="min-w-0">
                <label className={labelClasses}>From Date</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(event) => onFilterChange('date_from', event.target.value)}
                  max={filters.date_to || undefined}
                  className={inputClasses}
                  style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                />
              </div>

              {/* To Date */}
              <div className="min-w-0">
                <label className={labelClasses}>To Date</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(event) => onFilterChange('date_to', event.target.value)}
                  min={filters.date_from || undefined}
                  className={inputClasses}
                  style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                />
              </div>

              {/* Action Buttons */}
              <div className="col-span-full flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFilters}
                  type="button"
                  disabled={isLoading}
                  className="hover:bg-muted/80 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Filters
                </Button>
                <Button 
                  size="sm" 
                  onClick={onApplyFilters}
                  type="button"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="hover:opacity-90 active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                        <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                      Applying...
                    </>
                  ) : (
                    'Apply Filters'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
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
    <div className="rounded-lg border border-green-200 bg-green-50 px-3 sm:px-4 py-2 sm:py-3 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300 sm:flex sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs sm:text-sm">{message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="mt-2 sm:mt-0 inline-flex items-center text-xs sm:text-sm font-medium text-green-600 transition-colors hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 touch-manipulation"
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
  onViewPlayer: (player: Player) => void;
  page: number;
  pageSize: number;
};

function PlayersTableSection({
  data,
  hasActiveFilters,
  onOpenChat,
  onPageChange,
  onViewPlayer,
  page,
  pageSize,
}: PlayersTableSectionProps): ReactElement {
  const shouldShowEmpty = data !== null && data.results.length === 0;
  const showPagination = !!data && data.count > pageSize;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
            onViewPlayer={onViewPlayer}
          />
          {showPagination && (
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
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
    </div>
  );
}

type PlayersTableProps = {
  onOpenChat: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  players: Player[];
};

function PlayersTable({
  onOpenChat,
  onViewPlayer,
  players,
}: PlayersTableProps): ReactElement {
  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            onOpenChat={onOpenChat}
            onViewPlayer={onViewPlayer}
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
                onViewPlayer={onViewPlayer}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

type PlayerCardProps = {
  onOpenChat: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  player: Player;
};

function PlayerCard({
  onOpenChat,
  onViewPlayer,
  player,
}: PlayerCardProps): ReactElement {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Top Section: Avatar, Name, Status */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onOpenChat(player)}
            className="flex-shrink-0 touch-manipulation"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-base font-semibold text-white shadow-md">
              {player.username.charAt(0).toUpperCase()}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenChat(player)}
                  className="text-left w-full touch-manipulation"
                >
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {player.username}
                  </h3>
                  {player.full_name && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      {player.full_name}
                    </p>
                  )}
                </button>
              </div>
              <Badge 
                variant={player.is_active ? 'success' : 'danger'} 
                className="text-[10px] px-2 py-0.5 shrink-0"
              >
                {player.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Contact & Balances */}
      <div className="p-3 space-y-2 border-b border-gray-100 dark:border-gray-800">
        {/* Email */}
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
            {player.email}
          </span>
        </div>

        {/* Balances Row */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <svg className="h-3 w-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 uppercase">Credit</span>
            </div>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(player.balance)}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <svg className="h-3 w-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-medium text-green-700 dark:text-green-300 uppercase">Winning</span>
            </div>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">
              {formatCurrency(player.winning_balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Date & Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(player.created)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onViewPlayer(player)}
            title="View Details"
            className="p-1.5 touch-manipulation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

type PlayersTableRowProps = {
  onOpenChat: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  player: Player;
};

function PlayersTableRow({
  onOpenChat,
  onViewPlayer,
  player,
}: PlayersTableRowProps): ReactElement {
  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
            {player.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {player.username}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{player.full_name || '—'}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-700 dark:text-gray-300">{player.email}</div>
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
      <TableCell className="text-right">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewPlayer(player)}
            title="View player"
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
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

