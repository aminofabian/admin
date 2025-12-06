'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { playersApi, agentsApi, paymentMethodsApi } from '@/lib/api';
import { usePagination } from '@/lib/hooks';
import {
  Badge,
  Button,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Select,
} from '@/components/ui';
import {
  EmptyState,
  ErrorState,
} from '@/components/features';
import type { PlayersFiltersState } from '@/components/dashboard/players/players-filters';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type {
  Agent,
  Company,
  PaginatedResponse,
  Player,
} from '@/types';

type SuperAdminFilterState = PlayersFiltersState & {
  company: string;
};

type PlayersDataState = {
  data: PaginatedResponse<Player> | null;
  error: string;
  isLoading: boolean;
};

type SuperAdminPlayersPageContext = {
  dataState: ReturnType<typeof useSuperAdminPlayersData>;
  filters: ReturnType<typeof useSuperAdminPlayerFilters>;
  pagination: ReturnType<typeof usePagination>;
  router: ReturnType<typeof useRouter>;
  agentOptions: Array<{ value: string; label: string }>;
  isAgentLoading: boolean;
  companies: Company[];
  isLoadingCompanies: boolean;
};

export default function SuperAdminPlayersDashboard(): ReactElement {
  const {
    dataState,
    filters,
    pagination,
    router,
    agentOptions,
    isAgentLoading,
    companies,
    isLoadingCompanies,
  } = useSuperAdminPlayersPageContext();

  if (dataState.shouldShowLoading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <div className="flex flex-col shrink-0">
              <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex-1 min-w-0" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-8 gap-4 px-4 py-3">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>

              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-8 gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex justify-end gap-2">
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
        totalCount={dataState.data?.count ?? 0}
      />
      <SuperAdminPlayersFiltersWrapper
        filters={filters.values}
        onFilterChange={filters.setFilter}
        onApply={filters.applyFilters}
        onClear={filters.clearFilters}
        agentOptions={agentOptions}
        isAgentLoading={isAgentLoading}
        isLoading={dataState.isLoading}
        companies={companies}
        isLoadingCompanies={isLoadingCompanies}
      />
      <SuperAdminPlayersTableSection
        data={dataState.data}
        hasActiveFilters={filters.hasActiveFilters}
        onOpenChat={(player) => {
          const chatUrl = `/dashboard/chat?playerId=${player.id}`;
          router.push(chatUrl);
        }}
        onPageChange={pagination.setPage}
        onViewPlayer={(player) => router.push(`/dashboard/players/${player.id}`)}
        page={pagination.page}
        pageSize={pagination.pageSize}
      />
    </div>
  );
}

function useSuperAdminPlayersPageContext(): SuperAdminPlayersPageContext {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pagination = usePagination();

  // Read agent username from URL params
  const agentFromUrl = searchParams.get('agent');

  // Load agents for filter dropdown
  const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  // Load companies
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  // Initialize filters with pagination and initial agent from URL (if present)
  const filters = useSuperAdminPlayerFilters(pagination.setPage, agentFromUrl || undefined);

  // Clear all filters and set only agent filter when agent is in URL
  const hasInitializedAgentRef = useRef(false);
  useEffect(() => {
    // Only initialize once when agent is in URL
    if (agentFromUrl && !hasInitializedAgentRef.current) {
      console.log('🔄 Clearing previous filters and setting agent filter from URL:', agentFromUrl);
      // Clear all filters first
      filters.clearFilters();
      // Then set only the agent filter and apply it immediately
      filters.setFilterAndApply('agent', agentFromUrl);
      hasInitializedAgentRef.current = true;
    } else if (!agentFromUrl && hasInitializedAgentRef.current) {
      // Reset the ref when agent is removed from URL
      hasInitializedAgentRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFromUrl]); // Only run when agentFromUrl changes

  // Fetch companies
  useEffect(() => {
    let isMounted = true;

    const loadCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const response = await paymentMethodsApi.getManagementCompanies();
        if (response.companies && isMounted) {
          setCompanies(response.companies);
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
        if (isMounted) {
          setCompanies([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCompanies(false);
        }
      }
    };

    loadCompanies();

    return () => {
      isMounted = false;
    };
  }, []);

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
  useEffect(() => {
    if (agentFromUrl) {
      const timeoutId = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete('agent');
        const newSearch = params.toString();
        const newUrl = newSearch
          ? `${pathname}?${newSearch}`
          : pathname;
        window.history.replaceState({}, '', newUrl);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [agentFromUrl, pathname]);

  const dataState = useSuperAdminPlayersData({
    filters: filters.appliedFilters,
    pagination,
  });

  return {
    dataState,
    filters,
    pagination,
    router,
    agentOptions,
    isAgentLoading,
    companies,
    isLoadingCompanies,
  };
}

function useSuperAdminPlayersData({
  filters,
  pagination,
}: {
  filters: SuperAdminFilterState;
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
      }

      // Add company filter (company_id)
      if (filters.company.trim() && filters.company !== 'all') {
        const companyId = parseInt(filters.company, 10);
        if (!isNaN(companyId)) {
          params.company_id = companyId;
        }
      }

      // Add date filters if provided
      if (filters.date_from && filters.date_from.trim()) {
        const dateStr = filters.date_from.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          params.date_from = dateStr;
        } else {
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
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          params.date_to = dateStr;
        } else {
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
    filters.company,
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
    shouldShowLoading: state.isLoading,
  };
}

function useSuperAdminPlayerFilters(
  setPage: (page: number) => void,
  initialAgent?: string,
): {
  applyFilters: () => void;
  clearFilters: () => void;
  setFilter: (key: keyof SuperAdminFilterState, value: string) => void;
  setFilterAndApply: (key: keyof SuperAdminFilterState, value: string) => void;
  appliedFilters: SuperAdminFilterState;
  values: SuperAdminFilterState;
  hasActiveFilters: boolean;
} {
  const [filters, setFilters] = useState<SuperAdminFilterState>({
    username: '',
    full_name: '',
    email: '',
    agent: initialAgent || '',
    company: 'all',
    date_from: '',
    date_to: '',
    status: 'all',
    state: 'all',
  });

  const [appliedFilters, setAppliedFilters] = useState<SuperAdminFilterState>({
    username: '',
    full_name: '',
    email: '',
    agent: initialAgent || '',
    company: 'all',
    date_from: '',
    date_to: '',
    status: 'all',
    state: 'all',
  });

  const setFilter = useCallback((key: keyof SuperAdminFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPage(1);
  }, [filters, setPage]);

  const clearFilters = useCallback(() => {
    const clearedFilters: SuperAdminFilterState = {
      username: '',
      full_name: '',
      email: '',
      agent: '',
      company: 'all',
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
      appliedFilters.company.trim() !== '' && appliedFilters.company !== 'all' ||
      appliedFilters.date_from.trim() !== '' ||
      appliedFilters.date_to.trim() !== '' ||
      (appliedFilters.status.trim() !== '' && appliedFilters.status !== 'all') ||
      (appliedFilters.state.trim() !== '' && appliedFilters.state !== 'all')
    );
  }, [appliedFilters]);

  const setFilterAndApply = useCallback((key: keyof SuperAdminFilterState, value: string) => {
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters, [key]: value };
      setAppliedFilters(updatedFilters);
      setPage(1);
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


function PlayersHeader({
  totalCount,
}: {
  totalCount: number;
}): ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex flex-col shrink-0">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Players
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'player' : 'players'}
          </p>
        </div>
        <div className="flex-1 min-w-0" />
      </div>
    </div>
  );
}

type SuperAdminPlayersFiltersWrapperProps = {
  filters: SuperAdminFilterState;
  onApply: () => void;
  onClear: () => void;
  onFilterChange: (key: keyof SuperAdminFilterState, value: string) => void;
  agentOptions: Array<{ value: string; label: string }>;
  isAgentLoading: boolean;
  isLoading: boolean;
  companies: Company[];
  isLoadingCompanies: boolean;
};

function SuperAdminPlayersFiltersWrapper({
  filters,
  onApply,
  onClear,
  onFilterChange,
  agentOptions,
  isAgentLoading,
  isLoading,
  companies,
  isLoadingCompanies,
}: SuperAdminPlayersFiltersWrapperProps): ReactElement {
  const [isOpen, setIsOpen] = useState(() => 
    Boolean(filters.agent?.trim() || (filters.company && filters.company !== 'all'))
  );

  useEffect(() => {
    const hasActiveFilters =
      filters.username.trim() !== '' ||
      filters.full_name.trim() !== '' ||
      filters.email.trim() !== '' ||
      filters.agent.trim() !== '' ||
      (filters.company && filters.company !== 'all') ||
      filters.date_from.trim() !== '' ||
      filters.date_to.trim() !== '' ||
      (filters.status.trim() !== '' && filters.status !== 'all') ||
      (filters.state.trim() !== '' && filters.state !== 'all');

    if (hasActiveFilters) {
      setIsOpen(true);
    }
  }, [filters]);

  const companyOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Companies' },
      ...companies.map((company) => ({
        value: String(company.id),
        label: company.project_name,
      })),
    ];
  }, [companies]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-md shadow-black/5 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-900/40">
      <div className="flex items-center justify-between text-foreground">
        <h3 className="flex items-center gap-3 text-base font-semibold text-foreground transition-colors">
          <svg className="w-5 h-5 text-muted-foreground transition-colors dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
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
            {/* Company Filter */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                Company
              </label>
              <Select
                value={filters.company || 'all'}
                onChange={(value: string) => onFilterChange('company', value)}
                options={companyOptions}
                placeholder="All Companies"
                isLoading={isLoadingCompanies}
                disabled={isLoadingCompanies}
              />
            </div>

            {/* Player Username */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                Player Username
              </label>
              <input
                type="text"
                value={filters.username}
                onChange={(event) => onFilterChange('username', event.target.value)}
                placeholder="Enter username..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30"
              />
            </div>

            {/* Full Name */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={filters.full_name}
                onChange={(event) => onFilterChange('full_name', event.target.value)}
                placeholder="Enter full name..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30"
              />
            </div>

            {/* Email */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={filters.email}
                onChange={(event) => onFilterChange('email', event.target.value)}
                placeholder="Filter by email"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30"
              />
            </div>

            {/* Agent */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                Agent
              </label>
              <Select
                value={filters.agent}
                onChange={(value: string) => onFilterChange('agent', value)}
                options={[
                  { value: '', label: 'All Agents' },
                  ...agentOptions,
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
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                Status
              </label>
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
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                State
              </label>
              <Select
                value={filters.state}
                onChange={(value: string) => onFilterChange('state', value)}
                options={[
                  { value: 'all', label: 'All States' },
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
                ]}
                placeholder="All States"
              />
            </div>

            {/* From Date */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                From Date
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(event) => onFilterChange('date_from', event.target.value)}
                max={filters.date_to || undefined}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30"
              />
            </div>

            {/* To Date */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300">
                To Date
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(event) => onFilterChange('date_to', event.target.value)}
                min={filters.date_from || undefined}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30"
              />
            </div>

            <div className="col-span-full flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                type="button"
                disabled={isLoading}
                className="hover:bg-muted/80 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Filters
              </Button>
              <Button
                size="sm"
                onClick={onApply}
                type="button"
                isLoading={isLoading}
                disabled={isLoading}
                className="hover:opacity-90 active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Applying...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


type SuperAdminPlayersTableSectionProps = {
  data: PaginatedResponse<Player> | null;
  hasActiveFilters: boolean;
  onOpenChat: (player: Player) => void;
  onPageChange: (page: number) => void;
  onViewPlayer: (player: Player) => void;
  page: number;
  pageSize: number;
};

function SuperAdminPlayersTableSection({
  data,
  hasActiveFilters,
  onOpenChat,
  onPageChange,
  onViewPlayer,
  page,
  pageSize,
}: SuperAdminPlayersTableSectionProps): ReactElement {
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
          <SuperAdminPlayersTable
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

type SuperAdminPlayersTableProps = {
  onOpenChat: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  players: Player[];
};

function SuperAdminPlayersTable({
  onOpenChat,
  onViewPlayer,
  players,
}: SuperAdminPlayersTableProps): ReactElement {
  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4">
        {players.map((player) => (
          <SuperAdminPlayerCard
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
              <TableHead>Company</TableHead>
              <TableHead>Credit</TableHead>
              <TableHead>Winning</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
              <SuperAdminPlayersTableRow
                key={player.id}
                player={player}
                onViewPlayer={onViewPlayer}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

type SuperAdminPlayerCardProps = {
  onOpenChat: (player: Player) => void;
  onViewPlayer: (player: Player) => void;
  player: Player;
};

function SuperAdminPlayerCard({
  onOpenChat,
  onViewPlayer,
  player,
}: SuperAdminPlayerCardProps): ReactElement {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
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

      <div className="p-3 space-y-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
            {player.email}
          </span>
        </div>

        {player.company_username && (
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
              {player.company_username}
            </span>
          </div>
        )}

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

type SuperAdminPlayersTableRowProps = {
  onViewPlayer: (player: Player) => void;
  player: Player;
};

function SuperAdminPlayersTableRow({
  onViewPlayer,
  player,
}: SuperAdminPlayersTableRowProps): ReactElement {
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
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {player.company_username || '—'}
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


