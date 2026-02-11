'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { playersApi, agentsApi, paymentMethodsApi } from '@/lib/api';
import { usePagination } from '@/lib/hooks';
import {
  Badge,
  Button,
  DateSelect,
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
import { US_STATES } from '@/components/dashboard/players/players-filters';
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

  const inputClasses =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
  const labelClasses =
    'block text-xs font-medium text-muted-foreground mb-1.5 transition-colors dark:text-slate-400';
  const sectionHeadingClasses =
    'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 dark:text-slate-400';

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-slate-700/80">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          <svg className="w-5 h-5 text-muted-foreground dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-slate-800"
        >
          {isOpen ? (
            <>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="p-4 text-foreground space-y-6">
          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Search
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClasses}>Company</label>
                <Select
                  value={filters.company || 'all'}
                  onChange={(v) => onFilterChange('company', v)}
                  options={companyOptions}
                  placeholder="All Companies"
                  isLoading={isLoadingCompanies}
                  disabled={isLoadingCompanies}
                />
              </div>
              <div>
                <label className={labelClasses}>Username</label>
                <input
                  type="text"
                  value={filters.username}
                  onChange={(e) => onFilterChange('username', e.target.value)}
                  placeholder="Enter username..."
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Full name</label>
                <input
                  type="text"
                  value={filters.full_name}
                  onChange={(e) => onFilterChange('full_name', e.target.value)}
                  placeholder="Enter full name..."
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Email</label>
                <input
                  type="email"
                  value={filters.email}
                  onChange={(e) => onFilterChange('email', e.target.value)}
                  placeholder="Filter by email"
                  className={inputClasses}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Filters
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>Status</label>
                <Select
                  value={filters.status}
                  onChange={(v) => onFilterChange('status', v)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  placeholder="All Statuses"
                />
              </div>
              <div>
                <label className={labelClasses}>State</label>
                <Select
                  value={filters.state}
                  onChange={(v) => onFilterChange('state', v)}
                  options={[
                    { value: 'all', label: 'All States' },
                    ...US_STATES,
                  ]}
                  placeholder="All States"
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Date range
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DateSelect
                label="From date"
                value={filters.date_from}
                onChange={(v) => onFilterChange('date_from', v)}
              />
              <DateSelect
                label="To date"
                value={filters.date_to}
                onChange={(v) => onFilterChange('date_to', v)}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border dark:border-slate-700/80">
            <Button variant="ghost" size="sm" onClick={onClear} type="button" disabled={isLoading} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
              Clear
            </Button>
            <Button size="sm" onClick={onApply} type="button" isLoading={isLoading} disabled={isLoading} className="min-w-[100px] disabled:opacity-50">
              {isLoading ? 'Applying…' : 'Apply'}
            </Button>
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
  page: number;
  pageSize: number;
};

function SuperAdminPlayersTableSection({
  data,
  hasActiveFilters,
  onOpenChat,
  onPageChange,
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
  players: Player[];
};

function SuperAdminPlayersTable({
  onOpenChat,
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
              <SuperAdminPlayersTableRow
                key={player.id}
                player={player}
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
  player: Player;
};

function SuperAdminPlayerCard({
  onOpenChat,
  player,
}: SuperAdminPlayerCardProps): ReactElement {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <Link
            href={`/dashboard/players/${player.id}`}
            className="flex-shrink-0 touch-manipulation block"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-base font-semibold text-white shadow-md hover:opacity-90 transition-opacity">
              {player.username.charAt(0).toUpperCase()}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/players/${player.id}`}
                  className="text-left w-full block touch-manipulation group"
                >
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {player.username}
                  </h3>
                  {player.full_name && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      {player.full_name}
                    </p>
                  )}
                </Link>
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
      </div>
    </div>
  );
}

type SuperAdminPlayersTableRowProps = {
  player: Player;
};

function SuperAdminPlayersTableRow({
  player,
}: SuperAdminPlayersTableRowProps): ReactElement {
  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <Link
          href={`/dashboard/players/${player.id}`}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm group-hover:opacity-90 transition-opacity">
            {player.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {player.username}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
              {player.full_name || '—'}
            </div>
          </div>
        </Link>
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
    </TableRow>
  );
}


