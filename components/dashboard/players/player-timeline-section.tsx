'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  DateSelect,
  Pagination,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import {
  ActivityDetailsModal,
  EmptyState,
  TransactionDetailsModal,
  type TransactionDetailsNavigation,
} from '@/components/features';
import { DashboardSectionContainer } from '@/components/dashboard/layout';
import { transactionsApi } from '@/lib/api';
import {
  formatCurrency,
  formatDate,
  formatPaymentMethod,
  isNonMonetaryGameActivityType,
} from '@/lib/utils/formatters';
import {
  getTransactionAmountColorClass,
  getTransactionTypeBadgeStyle,
} from '@/lib/utils/transaction-display';
import {
  applyListDateFilterChange,
  LIST_DATE_PRESET_OPTIONS,
  type ListFilterDateFields,
} from '@/lib/utils/list-filter-date-preset';
import {
  mapPlayerTimelineResult,
  playerTimelineItemToTransaction,
  playerTimelineItemToTransactionQueue,
  resolvePlayerTimelineBonusAmount,
  type PlayerTimelineItem,
} from '@/lib/utils/player-timeline';
import type { Transaction, TransactionQueue } from '@/types';

const PAGE_SIZE = 10;

const labelClasses =
  'block text-xs font-medium text-muted-foreground mb-1.5 dark:text-slate-400';
const sectionHeadingClasses =
  'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 dark:text-slate-400';

const FILTER_ICON = (
  <svg
    className="h-5 w-5 text-muted-foreground transition-colors dark:text-slate-200"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <defs>
      <linearGradient id="timelineFilterIconGradient" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" />
      </linearGradient>
    </defs>
    <path
      stroke="url(#timelineFilterIconGradient)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
    />
  </svg>
);

const CHEVRON_ICON = (
  <svg
    className="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const CLOCK_ICON = (
  <svg
    className="h-5 w-5 text-white sm:h-6 sm:w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function TimelineLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        {[...Array(6)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-[4.5rem] w-full rounded-none border-b border-gray-100 last:border-0 dark:border-gray-800"
          />
        ))}
      </div>
    </div>
  );
}

const TIMELINE_SKELETON = <TimelineLoadingSkeleton />;

type TimelineDateFilters = ListFilterDateFields;

const DEFAULT_DATE_FILTERS: TimelineDateFilters = {
  date_preset: '',
  date_from: '',
  date_to: '',
};

function mapStatusToVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'pending' || status === 'processing') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  return 'default';
}

function mapGameTypeToLabel(type: string): string {
  const labels: Record<string, string> = {
    recharge_game: 'Recharge',
    redeem_game: 'Redeem',
    add_user_game: 'Add User',
    create_game: 'Create Game',
    reset_password: 'Reset Password',
    change_password: 'Change Password',
  };
  return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimelineTypeLabel(item: PlayerTimelineItem): string {
  if (item.kind === 'game_activity') {
    return mapGameTypeToLabel(item.type);
  }
  const { isTransfer } = getTransactionTypeBadgeStyle(item.type, item.payment_method);
  if (isTransfer) return 'Transfer';
  return item.type.charAt(0).toUpperCase() + item.type.slice(1);
}

function sanitizeDateFilters(filters: TimelineDateFilters): TimelineDateFilters {
  const sanitized = { ...filters };
  if (sanitized.date_from) {
    const parsed = new Date(sanitized.date_from.trim());
    if (!Number.isNaN(parsed.getTime())) {
      sanitized.date_from = parsed.toISOString().split('T')[0];
    }
  }
  if (sanitized.date_to) {
    const parsed = new Date(sanitized.date_to.trim());
    if (!Number.isNaN(parsed.getTime())) {
      sanitized.date_to = parsed.toISOString().split('T')[0];
    }
  }
  return sanitized;
}

function formatDateRangeLabel(filters: TimelineDateFilters): string | null {
  if (!filters.date_from && !filters.date_to) return null;
  if (filters.date_from && filters.date_to) {
    return `${filters.date_from} → ${filters.date_to}`;
  }
  if (filters.date_from) return `From ${filters.date_from}`;
  return `Until ${filters.date_to}`;
}

function getKindStyles(kind: PlayerTimelineItem['kind']) {
  if (kind === 'game_activity') {
    return {
      accent: 'border-l-emerald-500',
      pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50',
      iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
      label: 'Game',
    };
  }
  return {
    accent: 'border-l-indigo-500',
    pill: 'bg-indigo-50 text-indigo-800 ring-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800/50',
    iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400',
    label: 'Txn',
  };
}

interface TimelinePageHeaderProps {
  username: string;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  hasActiveDateFilters: boolean;
  appliedRangeLabel: string | null;
}

function TimelinePageHeader({
  username,
  totalCount,
  isLoading,
  error,
  hasActiveDateFilters,
  appliedRangeLabel,
}: TimelinePageHeaderProps) {
  return (
    <header className="overflow-hidden rounded-xl border border-gray-200 bg-[#eff3ff] shadow-sm dark:border-gray-700 dark:bg-indigo-950/30">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 md:p-6">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md sm:h-11 sm:w-11">
            {CLOCK_ICON}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-xl md:text-2xl">
              Player timeline
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Unified history for{' '}
              <span className="inline-flex items-center rounded-md bg-white/70 px-2 py-0.5 font-semibold text-indigo-800 ring-1 ring-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-800/60">
                @{username}
              </span>
            </p>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">
              Purchases, cashouts, recharges, redeems, and other game actions in one place
            </p>
          </div>
        </div>
        {!isLoading && !error && totalCount > 0 && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <span className="inline-flex items-center rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-indigo-800 shadow-sm dark:border-indigo-800/50 dark:bg-indigo-950/50 dark:text-indigo-200">
              {totalCount.toLocaleString()} total
            </span>
            {hasActiveDateFilters && appliedRangeLabel && (
              <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-xs font-medium text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                {appliedRangeLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

interface TimelineFilterPanelProps {
  dateFilters: TimelineDateFilters;
  filtersOpen: boolean;
  hasActiveDateFilters: boolean;
  onToggle: () => void;
  onDateFilterChange: (key: keyof TimelineDateFilters, value: string) => void;
  onApply: () => void;
  onClear: () => void;
}

function TimelineFilterPanel({
  dateFilters,
  filtersOpen,
  hasActiveDateFilters,
  onToggle,
  onDateFilterChange,
  onApply,
  onClear,
}: TimelineFilterPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-slate-700/80">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          {FILTER_ICON}
          Date filters
        </h2>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onToggle}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-slate-800"
          aria-expanded={filtersOpen}
        >
          {filtersOpen ? (
            <>
              <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show
            </>
          )}
        </Button>
      </div>

      {filtersOpen && (
        <div className="space-y-4 p-4 sm:p-5">
          <section>
            <h3 className={sectionHeadingClasses}>
              <span className="h-4 w-1 rounded-full bg-primary/60" aria-hidden />
              Period
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-4">
                <label className={labelClasses}>Period</label>
                <Select
                  value={dateFilters.date_preset}
                  onChange={(v) => onDateFilterChange('date_preset', v)}
                  options={LIST_DATE_PRESET_OPTIONS}
                  placeholder="All time"
                />
              </div>
              {dateFilters.date_preset === 'custom' && (
                <>
                  <DateSelect
                    label="From date"
                    value={dateFilters.date_from}
                    onChange={(v) => onDateFilterChange('date_from', v)}
                  />
                  <DateSelect
                    label="To date"
                    value={dateFilters.date_to}
                    onChange={(v) => onDateFilterChange('date_to', v)}
                  />
                </>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 dark:border-slate-700/80">
            <Button variant="primary" size="sm" type="button" onClick={onApply}>
              Apply filters
            </Button>
            {hasActiveDateFilters && (
              <Button variant="secondary" size="sm" type="button" onClick={onClear}>
                Clear dates
              </Button>
            )}
            <p className="ml-auto hidden text-xs text-muted-foreground sm:block dark:text-slate-500">
              Filters apply to both transactions and game activities
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

interface TimelineRowProps {
  item: PlayerTimelineItem;
  onView: (item: PlayerTimelineItem) => void;
}

const TimelineTableRow = memo(function TimelineTableRow({ item, onView }: TimelineRowProps) {
  const statusVariant = mapStatusToVariant(item.status);
  const typeLabel = formatTimelineTypeLabel(item);
  const kindStyles = getKindStyles(item.kind);
  const detailLabel =
    item.kind === 'game_activity'
      ? item.game || item.game_code || '—'
      : formatPaymentMethod(item.payment_method || '—');

  const showAmount = !(
    item.kind === 'game_activity' && isNonMonetaryGameActivityType(item.type)
  );
  const amountColor = getTransactionAmountColorClass(item.type, item.amount);
  const bonusAmount = resolvePlayerTimelineBonusAmount(item);
  const formattedBonus = bonusAmount ? formatCurrency(bonusAmount) : null;
  const { variant: typeVariant, isTransfer } = getTransactionTypeBadgeStyle(
    item.type,
    item.payment_method,
  );

  return (
    <TableRow
      className={`group cursor-pointer border-l-[3px] transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 ${kindStyles.accent}`}
      onClick={() => onView(item)}
    >
      <TableCell className="align-middle">
        <div className="rounded-lg border border-gray-200/80 bg-gray-50/60 px-2.5 py-2 dark:border-gray-600/80 dark:bg-gray-800/40">
          <Badge
            variant={typeVariant}
            className={`text-xs font-medium uppercase ${isTransfer ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' : ''}`}
          >
            {typeLabel}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${kindStyles.pill}`}
        >
          {kindStyles.label === 'Game' ? 'Game activity' : 'Transaction'}
        </span>
      </TableCell>
      <TableCell className="align-middle">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailLabel}</span>
        {item.id && (
          <p className="mt-0.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">
            {item.id.length > 12 ? `${item.id.slice(0, 12)}…` : item.id}
          </p>
        )}
      </TableCell>
      <TableCell className="align-middle">
        {showAmount ? (
          <div className="rounded-lg border border-gray-200/80 bg-gray-50/60 px-2.5 py-2 dark:border-gray-600/80 dark:bg-gray-800/40">
            <div className={`text-sm font-bold tabular-nums ${amountColor}`}>
              {formatCurrency(item.amount ?? '0')}
            </div>
            {formattedBonus && (
              <div className={`mt-0.5 text-xs font-semibold tabular-nums ${amountColor}`}>
                +{formattedBonus} bonus
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
        )}
      </TableCell>
      <TableCell className="align-middle">
        <Badge variant={statusVariant} className="capitalize">
          {item.status}
        </Badge>
      </TableCell>
      <TableCell className="align-middle text-sm text-gray-600 dark:text-gray-400">
        <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
      </TableCell>
      <TableCell className="align-middle">{CHEVRON_ICON}</TableCell>
    </TableRow>
  );
});

const TimelineMobileCard = memo(function TimelineMobileCard({ item, onView }: TimelineRowProps) {
  const statusVariant = mapStatusToVariant(item.status);
  const typeLabel = formatTimelineTypeLabel(item);
  const kindStyles = getKindStyles(item.kind);
  const showAmount = !(
    item.kind === 'game_activity' && isNonMonetaryGameActivityType(item.type)
  );
  const amountColor = getTransactionAmountColorClass(item.type, item.amount);
  const bonusAmount = resolvePlayerTimelineBonusAmount(item);
  const formattedBonus = bonusAmount ? formatCurrency(bonusAmount) : null;
  const detailLabel =
    item.kind === 'game_activity'
      ? item.game || item.game_code
      : formatPaymentMethod(item.payment_method || '');

  return (
    <button
      type="button"
      onClick={() => onView(item)}
      className={`group flex w-full gap-3 border-l-[3px] px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:active:bg-gray-800/50 ${kindStyles.accent}`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kindStyles.iconBg}`}
      >
        {item.kind === 'game_activity' ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{typeLabel}</span>
          <Badge variant={statusVariant} className="text-[10px] capitalize">
            {item.status}
          </Badge>
        </div>
        {detailLabel && (
          <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-400">{detailLabel}</p>
        )}
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-500">
          {formatDate(item.created_at)}
        </p>
      </div>
      {showAmount && (
        <div className="shrink-0 self-center text-right">
          <p className={`text-sm font-bold tabular-nums ${amountColor}`}>
            {formatCurrency(item.amount ?? '0')}
          </p>
          {formattedBonus && (
            <p className={`mt-0.5 text-xs font-semibold tabular-nums ${amountColor}`}>
              +{formattedBonus} bonus
            </p>
          )}
        </div>
      )}
      {CHEVRON_ICON}
    </button>
  );
});

function TimelineMobileList({
  items,
  onView,
}: {
  items: PlayerTimelineItem[];
  onView: (item: PlayerTimelineItem) => void;
}) {
  return (
    <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
      {items.map((item) => (
        <TimelineMobileCard key={item.id} item={item} onView={onView} />
      ))}
    </div>
  );
}

interface PlayerTimelineSectionProps {
  playerId: number;
  username: string;
}

export function PlayerTimelineSection({
  playerId,
  username,
}: PlayerTimelineSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState<PlayerTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [dateFilters, setDateFilters] =
    useState<TimelineDateFilters>(DEFAULT_DATE_FILTERS);
  const [appliedDateFilters, setAppliedDateFilters] =
    useState<TimelineDateFilters>(DEFAULT_DATE_FILTERS);

  const [selectedItem, setSelectedItem] = useState<PlayerTimelineItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDrawerPage, setPendingDrawerPage] = useState<{
    page: number;
    focus: 'first' | 'last';
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchTimeline = useCallback(async () => {
    if (!username.trim()) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sanitized = sanitizeDateFilters(appliedDateFilters);
      const params: Record<string, string | number> = {
        username: username.trim(),
        page: currentPage,
        page_size: PAGE_SIZE,
      };
      if (sanitized.date_from) params.date_from = sanitized.date_from;
      if (sanitized.date_to) params.date_to = sanitized.date_to;

      const response = await transactionsApi.playerTimelineHistory(params);
      const mapped = response.results.map((row) =>
        mapPlayerTimelineResult(row as Record<string, unknown>),
      );

      setItems(mapped);
      setTotalCount(response.count ?? mapped.length);
      setHasNext(Boolean(response.next));
      setHasPrevious(Boolean(response.previous));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load player timeline';
      setError(message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [username, currentPage, appliedDateFilters]);

  useEffect(() => {
    void fetchTimeline();
  }, [fetchTimeline]);

  const handleDateFilterChange = useCallback(
    (key: keyof TimelineDateFilters, value: string) => {
      setDateFilters((prev) =>
        applyListDateFilterChange(prev, key, value) as TimelineDateFilters,
      );
    },
    [],
  );

  const handleApplyFilters = useCallback(() => {
    setAppliedDateFilters(dateFilters);
    setCurrentPage(1);
  }, [dateFilters]);

  const handleClearFilters = useCallback(() => {
    setDateFilters(DEFAULT_DATE_FILTERS);
    setAppliedDateFilters(DEFAULT_DATE_FILTERS);
    setCurrentPage(1);
  }, []);

  const handleViewItem = useCallback((item: PlayerTimelineItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
  }, []);

  const handleBackToPlayer = useCallback(() => {
    router.push(`/dashboard/players/${playerId}`);
  }, [router, playerId]);

  const navigateTimelineItem = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedItem || isLoading || pendingDrawerPage) return;

      const idx = items.findIndex((row) => row.id === selectedItem.id);
      if (idx < 0) return;

      if (direction === 'prev') {
        if (idx > 0) {
          setSelectedItem(items[idx - 1]);
          return;
        }
        if (currentPage <= 1) return;
        setPendingDrawerPage({ page: currentPage - 1, focus: 'last' });
        setCurrentPage(currentPage - 1);
        return;
      }

      if (idx < items.length - 1) {
        setSelectedItem(items[idx + 1]);
        return;
      }
      if (currentPage >= totalPages) return;
      setPendingDrawerPage({ page: currentPage + 1, focus: 'first' });
      setCurrentPage(currentPage + 1);
    },
    [selectedItem, isLoading, pendingDrawerPage, items, currentPage, totalPages],
  );

  useEffect(() => {
    if (!pendingDrawerPage || !isModalOpen || isLoading) return;
    if (currentPage !== pendingDrawerPage.page) return;
    if (items.length === 0) {
      setPendingDrawerPage(null);
      return;
    }
    const next =
      pendingDrawerPage.focus === 'first' ? items[0] : items[items.length - 1];
    if (next) setSelectedItem(next);
    setPendingDrawerPage(null);
  }, [pendingDrawerPage, isModalOpen, isLoading, currentPage, items]);

  const drawerNavigation = useMemo((): TransactionDetailsNavigation | undefined => {
    if (!selectedItem || totalCount <= 0) return undefined;
    const idx = items.findIndex((row) => row.id === selectedItem.id);
    if (idx < 0) return undefined;
    return {
      currentPosition: (currentPage - 1) * PAGE_SIZE + idx + 1,
      total: totalCount,
      onPrevious: () => navigateTimelineItem('prev'),
      onNext: () => navigateTimelineItem('next'),
      isLoading: isLoading || pendingDrawerPage != null,
    };
  }, [
    selectedItem,
    totalCount,
    items,
    currentPage,
    navigateTimelineItem,
    isLoading,
    pendingDrawerPage,
  ]);

  const selectedActivity = useMemo((): TransactionQueue | null => {
    if (!selectedItem || selectedItem.kind !== 'game_activity') return null;
    return playerTimelineItemToTransactionQueue(selectedItem);
  }, [selectedItem]);

  const selectedTransaction = useMemo((): Transaction | null => {
    if (!selectedItem || selectedItem.kind !== 'transaction') return null;
    return playerTimelineItemToTransaction(selectedItem);
  }, [selectedItem]);

  const hasActiveDateFilters =
    appliedDateFilters.date_from.trim() !== '' ||
    appliedDateFilters.date_to.trim() !== '';

  const appliedRangeLabel = formatDateRangeLabel(appliedDateFilters);
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  const gameCountOnPage = items.filter((i) => i.kind === 'game_activity').length;
  const txnCountOnPage = items.filter((i) => i.kind === 'transaction').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={handleBackToPlayer}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Player profile
        </button>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden>
          /
        </span>
        <span className="font-medium text-gray-900 dark:text-gray-100">Timeline</span>
      </nav>

      <TimelinePageHeader
        username={username}
        totalCount={totalCount}
        isLoading={isLoading}
        error={error}
        hasActiveDateFilters={hasActiveDateFilters}
        appliedRangeLabel={appliedRangeLabel}
      />

      <TimelineFilterPanel
        dateFilters={dateFilters}
        filtersOpen={filtersOpen}
        hasActiveDateFilters={hasActiveDateFilters}
        onToggle={() => setFiltersOpen((o) => !o)}
        onDateFilterChange={handleDateFilterChange}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <DashboardSectionContainer
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={fetchTimeline}
        isEmpty={!isLoading && !error && items.length === 0}
        loadingState={TIMELINE_SKELETON}
        emptyState={
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-16 dark:border-gray-700 dark:bg-gray-900/30">
            <EmptyState
              title="No timeline entries"
              description={
                hasActiveDateFilters
                  ? 'No transactions or game activities matched your date filters. Try widening the range.'
                  : 'This player has no recorded transactions or game activities yet.'
              }
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3 rounded-t-xl border border-b-0 border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity feed</p>
            {totalCount > 0 && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Showing {pageStart}–{pageEnd} of {totalCount.toLocaleString()}
                {items.length > 0 && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {' '}
                    · {txnCountOnPage} txn{txnCountOnPage !== 1 ? 's' : ''}, {gameCountOnPage}{' '}
                    game{gameCountOnPage !== 1 ? 's' : ''} on this page
                  </span>
                )}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tap a row for full details</p>
        </div>

        <div className="overflow-hidden rounded-b-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/90 hover:bg-gray-50/90 dark:bg-gray-800/60 dark:hover:bg-gray-800/60">
                  <TableHead className="w-[140px] font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Game / Payment</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-10" aria-hidden />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TimelineTableRow key={item.id} item={item} onView={handleViewItem} />
                ))}
              </TableBody>
            </Table>
          </div>

          <TimelineMobileList items={items} onView={handleViewItem} />

          {totalCount > PAGE_SIZE && (
            <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/30">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </DashboardSectionContainer>

      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          navigation={drawerNavigation}
        />
      )}

      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          navigation={drawerNavigation}
        />
      )}
    </div>
  );
}
