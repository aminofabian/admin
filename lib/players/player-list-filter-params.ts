import type { PlayersFiltersState } from '@/components/dashboard/players/players-filters';

/** Filter keys carried on player-detail URLs for prev/next within a filtered list. */
export const PLAYER_LIST_FILTER_QUERY_KEYS = [
  'username',
  'full_name',
  'email',
  'referred_by',
  'agent',
  'date_from',
  'date_to',
  'status',
  'state',
  'identity_verification_status',
  'first_deposit_done',
  'company',
] as const;

export type PlayerListFilterQueryKey = (typeof PLAYER_LIST_FILTER_QUERY_KEYS)[number];

export type PlayerListFilterValues = Partial<PlayersFiltersState> & {
  company?: string;
};

const DEFAULT_SELECT_VALUE = 'all';

function isActiveFilterValue(key: PlayerListFilterQueryKey, value: string | undefined): boolean {
  if (value == null) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (
    key === 'status' ||
    key === 'state' ||
    key === 'identity_verification_status' ||
    key === 'first_deposit_done' ||
    key === 'company'
  ) {
    return trimmed !== DEFAULT_SELECT_VALUE;
  }
  return true;
}

/**
 * Build URLSearchParams from applied list filters (only non-default values).
 */
export function buildPlayerListFilterSearchParams(
  filters: PlayerListFilterValues,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of PLAYER_LIST_FILTER_QUERY_KEYS) {
    const value = filters[key];
    if (typeof value === 'string' && isActiveFilterValue(key, value)) {
      params.set(key, value.trim());
    }
  }

  return params;
}

/**
 * Extract whitelist filter query params from the current player-detail URL.
 */
export function extractPlayerListFilterSearchParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null; toString?: () => string },
): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of PLAYER_LIST_FILTER_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value != null && isActiveFilterValue(key, value)) {
      params.set(key, value.trim());
    }
  }

  return params;
}

/**
 * Convert filter query params into playersApi.list filter fields.
 */
export function playerListApiParamsFromSearchParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): Record<string, string | number | boolean> {
  const extracted = extractPlayerListFilterSearchParams(searchParams);
  const params: Record<string, string | number | boolean> = {};

  const username = extracted.get('username');
  if (username) params.username = username;

  const fullName = extracted.get('full_name');
  if (fullName) params.full_name = fullName;

  const email = extracted.get('email');
  if (email) params.email = email;

  const referredBy = extracted.get('referred_by');
  if (referredBy) params.referred_by = referredBy;

  const agent = extracted.get('agent');
  if (agent) params.agent = agent;

  const dateFrom = extracted.get('date_from');
  if (dateFrom) params.date_from = dateFrom;

  const dateTo = extracted.get('date_to');
  if (dateTo) params.date_to = dateTo;

  const status = extracted.get('status');
  if (status) params.status = status;

  const state = extracted.get('state');
  if (state) params.state = state;

  const identityVerificationStatus = extracted.get('identity_verification_status');
  if (identityVerificationStatus) {
    params.identity_verification_status = identityVerificationStatus;
  }

  const firstDepositDone = extracted.get('first_deposit_done');
  if (firstDepositDone === 'true' || firstDepositDone === 'false') {
    params.first_deposit_done = firstDepositDone === 'true';
  }

  const company = extracted.get('company');
  if (company) {
    const companyId = parseInt(company, 10);
    if (!Number.isNaN(companyId)) {
      params.company_id = companyId;
    }
  }

  return params;
}

export function buildPlayerDetailHref(
  playerId: number,
  filters?: PlayerListFilterValues | URLSearchParams | { get: (key: string) => string | null } | string | null,
): string {
  const base = `/dashboard/players/${playerId}`;

  if (!filters) {
    return base;
  }

  let query = '';
  if (typeof filters === 'string') {
    query = filters.replace(/^\?/, '');
  } else if (typeof (filters as { get?: unknown }).get === 'function') {
    query = extractPlayerListFilterSearchParams(
      filters as { get: (key: string) => string | null },
    ).toString();
  } else {
    query = buildPlayerListFilterSearchParams(filters as PlayerListFilterValues).toString();
  }

  return query ? `${base}?${query}` : base;
}

export function buildPlayersListHref(
  filters?: PlayerListFilterValues | URLSearchParams | { get: (key: string) => string | null } | string | null,
): string {
  const base = '/dashboard/players';

  if (!filters) {
    return base;
  }

  let query = '';
  if (typeof filters === 'string') {
    query = filters.replace(/^\?/, '');
  } else if (typeof (filters as { get?: unknown }).get === 'function') {
    query = extractPlayerListFilterSearchParams(
      filters as { get: (key: string) => string | null },
    ).toString();
  } else {
    query = buildPlayerListFilterSearchParams(filters as PlayerListFilterValues).toString();
  }

  return query ? `${base}?${query}` : base;
}

/**
 * Build PlayersFiltersState (plus optional company) from URL search params.
 */
export function playerListFilterStateFromSearchParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): PlayerListFilterValues {
  const get = (key: PlayerListFilterQueryKey, fallback = '') =>
    searchParams.get(key)?.trim() || fallback;

  return {
    username: get('username'),
    full_name: get('full_name'),
    email: get('email'),
    referred_by: get('referred_by'),
    agent: get('agent'),
    date_from: get('date_from'),
    date_to: get('date_to'),
    status: get('status', DEFAULT_SELECT_VALUE),
    state: get('state', DEFAULT_SELECT_VALUE),
    identity_verification_status: get('identity_verification_status', DEFAULT_SELECT_VALUE),
    first_deposit_done: get('first_deposit_done', DEFAULT_SELECT_VALUE),
    company: get('company', DEFAULT_SELECT_VALUE),
  };
}
