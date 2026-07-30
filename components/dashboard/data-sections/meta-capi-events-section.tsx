'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/features';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils/formatters';
import { metaCapiEventsApi } from '@/lib/api/meta-capi-events';
import type { MetaCapiEvent, MetaCapiEventSummary } from '@/types/meta-capi-event';
import {
  EMPTY_META_CAPI_FILTERS,
  MetaCapiEventsFilters,
  type MetaCapiEventsFilterKey,
  type MetaCapiEventsFiltersState,
} from '@/components/dashboard/history/meta-capi-events-filters';
import { MetaCapiEventDetailsModal } from '@/components/dashboard/data-sections/action-modal/meta-capi-event-details-modal';

const PAGE_SIZE = 20;

function statusVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const s = status.toLowerCase();
  if (s === 'sent') return 'success';
  if (s === 'failed') return 'danger';
  if (s === 'queued' || s === 'sending' || s === 'retrying') return 'warning';
  if (s === 'skipped') return 'default';
  return 'info';
}

function formatMoney(value: MetaCapiEvent['value'], currency: string | null): string {
  if (value == null || value === '') return '—';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(num)) return String(value);
  const prefix = currency?.trim() === 'USD' || !currency?.trim() ? '$' : `${currency} `;
  return `${prefix}${num.toFixed(2)}`;
}

function filtersToApiParams(filters: MetaCapiEventsFiltersState, page: number) {
  return {
    page,
    page_size: PAGE_SIZE,
    search: filters.search.trim() || undefined,
    event_name: filters.event_name || undefined,
    status: filters.status || undefined,
    username: filters.username.trim() || undefined,
    user_id: filters.user_id.trim() || undefined,
    event_id: filters.event_id.trim() || undefined,
    source_transaction_id: filters.source_transaction_id.trim() || undefined,
    pixel_id: filters.pixel_id.trim() || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    ordering: filters.ordering || '-created',
  };
}

function summaryFilterParams(filters: MetaCapiEventsFiltersState) {
  const { page: _p, page_size: _ps, ordering: _o, ...rest } = filtersToApiParams(filters, 1);
  return rest;
}

export function MetaCapiEventsSection() {
  const [draftFilters, setDraftFilters] =
    useState<MetaCapiEventsFiltersState>(EMPTY_META_CAPI_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<MetaCapiEventsFiltersState>(EMPTY_META_CAPI_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<MetaCapiEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<MetaCapiEventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MetaCapiEvent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const statusSummaryEntries = useMemo(() => {
    if (!summary?.by_status) return [];
    return Object.entries(summary.by_status).sort((a, b) => b[1] - a[1]);
  }, [summary]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listParams = filtersToApiParams(appliedFilters, page);
      const [list, summaryData] = await Promise.all([
        metaCapiEventsApi.list(listParams),
        metaCapiEventsApi.summary(summaryFilterParams(appliedFilters)),
      ]);
      setEvents(list.results);
      setTotalCount(list.count);
      setSummary(summaryData);
    } catch (e) {
      setEvents([]);
      setTotalCount(0);
      setSummary(null);
      setError(e instanceof Error ? e.message : 'Failed to load Meta CAPI events');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFilterChange = (key: MetaCapiEventsFilterKey, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    setPage(1);
    setAppliedFilters(draftFilters);
  };

  const handleClear = () => {
    setDraftFilters(EMPTY_META_CAPI_FILTERS);
    setAppliedFilters(EMPTY_META_CAPI_FILTERS);
    setPage(1);
  };

  const openDetail = async (event: MetaCapiEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const full = await metaCapiEventsApi.get(event.id);
      setSelectedEvent(full);
    } catch {
      // Keep list row data if detail fetch fails
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Meta CAPI Events
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conversion API events sent to Meta (Purchase, CompleteRegistration, and related).
        </p>
      </div>

      <MetaCapiEventsFilters
        filters={draftFilters}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
        onClear={handleClear}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen((v) => !v)}
        isLoading={loading}
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Total
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {summary.total}
            </div>
          </div>
          {statusSummaryEntries.map(([status, count]) => (
            <div
              key={status}
              className="rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {status}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {count}
                </span>
                <Badge variant={statusVariant(status)} className="capitalize">
                  {status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-3 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading Meta CAPI events…
          </div>
        ) : events.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No Meta CAPI events"
              description="Events will appear here after conversion API calls are queued or sent"
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Pixel</TableHead>
                  <TableHead>Source txn</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow
                    key={event.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => void openDetail(event)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{event.event_name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                        {event.event_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(event.status)} className="capitalize">
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {event.username ?? (event.user_id != null ? `#${event.user_id}` : '—')}
                      </div>
                      {event.user_email && (
                        <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {event.user_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatMoney(event.value, event.currency)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {event.pixel_id || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.source_transaction_id || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {event.created
                        ? formatDate(event.created)
                        : event.event_time
                          ? formatDate(event.event_time)
                          : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalCount > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  hasNext={page < totalPages}
                  hasPrevious={page > 1}
                />
              </div>
            )}
          </>
        )}
      </div>

      <MetaCapiEventDetailsModal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        isLoading={detailLoading}
      />
    </div>
  );
}
