import { apiClient } from './client';
import type { PaginatedResponse } from '@/types';
import type {
  MetaCapiEvent,
  MetaCapiEventFilters,
  MetaCapiEventSummary,
} from '@/types/meta-capi-event';

function cleanParams(
  filters?: MetaCapiEventFilters,
): Record<string, string | number | boolean | undefined> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = value as string | number | boolean;
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

function normalizePaginated(
  response: PaginatedResponse<MetaCapiEvent> | MetaCapiEvent[] | null | undefined,
): PaginatedResponse<MetaCapiEvent> {
  if (response && typeof response === 'object' && 'results' in response) {
    const results = Array.isArray(response.results) ? response.results : [];
    return {
      count: typeof response.count === 'number' ? response.count : results.length,
      next: response.next ?? null,
      previous: response.previous ?? null,
      results,
    };
  }
  if (Array.isArray(response)) {
    return {
      count: response.length,
      next: null,
      previous: null,
      results: response,
    };
  }
  return { count: 0, next: null, previous: null, results: [] };
}

function unwrapSummary(raw: unknown): MetaCapiEventSummary {
  const empty: MetaCapiEventSummary = {
    total: 0,
    by_status: {},
    by_event_name: {},
  };
  if (!raw || typeof raw !== 'object') return empty;

  const body = raw as Record<string, unknown>;
  const data =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body;

  const byStatus =
    data.by_status && typeof data.by_status === 'object'
      ? (data.by_status as Record<string, number>)
      : {};
  const byEventName =
    data.by_event_name && typeof data.by_event_name === 'object'
      ? (data.by_event_name as Record<string, number>)
      : {};

  return {
    total: typeof data.total === 'number' ? data.total : 0,
    by_status: byStatus,
    by_event_name: byEventName,
  };
}

export const metaCapiEventsApi = {
  list: async (filters?: MetaCapiEventFilters) => {
    const response = await apiClient.get<
      PaginatedResponse<MetaCapiEvent> | MetaCapiEvent[]
    >('api/admin/meta-capi-events', { params: cleanParams(filters) });
    return normalizePaginated(response);
  },

  get: async (id: number | string) => {
    return apiClient.get<MetaCapiEvent>(`api/admin/meta-capi-events/${id}`);
  },

  summary: async (filters?: Omit<MetaCapiEventFilters, 'page' | 'page_size' | 'ordering'>) => {
    const response = await apiClient.get<unknown>('api/admin/meta-capi-events/summary', {
      params: cleanParams(filters),
    });
    return unwrapSummary(response);
  },
};
