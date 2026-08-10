'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canManageEmailBroadcasts } from '@/lib/constants/roles';
import { emailBroadcastsApi } from '@/lib/api';
import {
  emailBroadcastAudienceLabel,
  formatEmailBroadcastCriteria,
  resolveEmailBroadcastCriteria,
} from '@/lib/constants/email-broadcasts';
import { createEmptyEmailCampaignDraft } from '@/lib/constants/email-campaign-composer';
import { getFilterFieldDef } from '@/lib/constants/email-campaign-filters';
import { writeComposerSeed } from '@/lib/utils/email-campaign-draft';
import {
  migrateLegacyFiltersToRows,
  normalizeFilterOperator,
} from '@/lib/utils/email-campaign-filters';
import { resolveEmailScopeUuid } from '@/lib/utils/project-uuid';
import { Badge, Button, SearchInput, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/features';
import type {
  EmailBroadcast,
  EmailCampaignComposerDraft,
  EmailCampaignFilterField,
  EmailCampaignFilterOperator,
  EmailCampaignFilterRow,
  EmailCampaignRecipientMethod,
} from '@/types';

type StatusGroup = 'all' | 'drafts' | 'in-flight' | 'completed' | 'failed';

const STATUS_META: Record<
  string,
  { label: string; group: StatusGroup; tone: 'success' | 'warning' | 'danger' | 'info' | 'default'; dot: string }
> = {
  draft: { label: 'Draft', group: 'drafts', tone: 'default', dot: 'bg-gray-400' },
  queued: { label: 'Queued', group: 'in-flight', tone: 'info', dot: 'bg-sky-500' },
  scheduled: { label: 'Scheduled', group: 'in-flight', tone: 'warning', dot: 'bg-amber-500' },
  sending: { label: 'Sending', group: 'in-flight', tone: 'info', dot: 'bg-sky-500 animate-pulse' },
  completed: { label: 'Completed', group: 'completed', tone: 'success', dot: 'bg-emerald-500' },
  failed: { label: 'Failed', group: 'failed', tone: 'danger', dot: 'bg-red-500' },
};

const GROUP_META: Record<StatusGroup, { label: string; icon: string; tint: string }> = {
  all: {
    label: 'All campaigns',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    tint: 'bg-[#6366f1]/10 text-[#4f46e5] dark:text-[#a5b4fc]',
  },
  drafts: {
    label: 'Drafts',
    icon: 'M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zm7 0v5h5',
    tint: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300',
  },
  'in-flight': {
    label: 'In queue',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    tint: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  },
  completed: {
    label: 'Completed',
    icon: 'M5 13l4 4L19 7',
    tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  failed: {
    label: 'Failed',
    icon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    tint: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  },
};

const AUDIENCE_ICON: Record<string, { d: string; tint: string }> = {
  specific: {
    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    tint: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  },
  filtered: {
    d: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    tint: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  },
  all_eligible: {
    d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  selected: {
    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    tint: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  },
  all: {
    d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  whitelabel: {
    d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
};

function Icon({ d, className = 'h-4 w-4' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function groupOf(status: string): StatusGroup {
  return STATUS_META[status]?.group || 'all';
}

function newRowId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Convert a previously sent/drafted campaign into a composer seed ("Reuse template"). */
function broadcastToComposerSeed(broadcast: EmailBroadcast): EmailCampaignComposerDraft {
  const seed = createEmptyEmailCampaignDraft();

  // New backend: structured filters + audience enum.
  const filters = Array.isArray(broadcast.filters) ? broadcast.filters : [];
  const userIds = Array.isArray(broadcast.user_ids)
    ? broadcast.user_ids
    : Array.isArray(broadcast.selected_user_ids)
      ? broadcast.selected_user_ids
      : [];

  const filterRows: EmailCampaignFilterRow[] = filters
    .map((filter): EmailCampaignFilterRow | null => {
      const def = getFilterFieldDef(filter.field as EmailCampaignFilterField);
      if (!def) return null;
      const row: EmailCampaignFilterRow = {
        id: newRowId(),
        field: def.field,
        operator: normalizeFilterOperator(filter.op) as EmailCampaignFilterOperator,
        value: '',
        value_to: '',
      };
      if (Array.isArray(filter.value)) {
        row.value = String(filter.value[0] ?? '');
        row.value_to = String(filter.value[1] ?? '');
      } else if (filter.value !== null && filter.value !== undefined) {
        row.value = String(filter.value);
      }
      return row;
    })
    .filter((row): row is EmailCampaignFilterRow => row !== null);

  // Legacy backend fallback (deposit criteria only; SSN/state have no new equivalent).
  const legacy = resolveEmailBroadcastCriteria(broadcast);
  const migrated = migrateLegacyFiltersToRows({
    deposit_min: legacy.deposit_min != null ? String(legacy.deposit_min) : '',
    deposit_max: legacy.deposit_max != null ? String(legacy.deposit_max) : '',
  });

  const audience = broadcast.audience;
  const recipientMethod: EmailCampaignRecipientMethod =
    audience === 'specific' || audience === 'selected' || userIds.length > 0
      ? 'specific'
      : audience === 'filtered' || filterRows.length > 0 || migrated.length > 0
        ? 'filtered'
        : 'all_eligible';

  return {
    ...seed,
    internal_name: broadcast.name || broadcast.subject,
    subject: broadcast.subject,
    html_body: broadcast.html_body,
    recipient_method: recipientMethod,
    selected_players: userIds.map((id) => ({
      id,
      username: `User #${id}`,
      email: '',
    })),
    match_mode: broadcast.filter_match === 'any' ? 'any' : 'all',
    filter_rows: [...filterRows, ...migrated],
    template_id: broadcast.template_id ?? null,
    // Reopening a draft keeps the server draft id so Save Draft PATCHes it.
    broadcast_id: groupOf(broadcast.status) === 'drafts' ? broadcast.id : null,
  };
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || {
    label: status,
    tone: 'default' as const,
    dot: 'bg-gray-400',
  };
  return (
    <Badge variant={meta.tone}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

function AudienceChip({ audience }: { audience: string }) {
  const icon = AUDIENCE_ICON[audience] || {
    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    tint: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${icon.tint}`}
    >
      <Icon d={icon.d} className="h-3.5 w-3.5" />
      {emailBroadcastAudienceLabel(audience)}
    </span>
  );
}

function DeliveryStats({ broadcast }: { broadcast: EmailBroadcast }) {
  const ok = broadcast.successful_deliveries ?? 0;
  const fail = broadcast.failed_deliveries ?? 0;
  const skip = broadcast.skipped_deliveries ?? 0;
  const delivered = ok + fail + skip;

  if (delivered <= 0) {
    const waiting: Record<string, string> = {
      draft: 'Not sent yet',
      queued: 'In queue',
      scheduled: 'Scheduled',
      sending: 'Sending…',
      completed: '0 delivered',
      failed: '0 delivered',
    };
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {waiting[broadcast.status] || '—'}
      </span>
    );
  }

  const pct = (n: number) => (delivered > 0 ? (n / delivered) * 100 : 0);
  return (
    <div className="min-w-[170px]">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        {ok > 0 ? <span className="bg-emerald-500" style={{ width: `${pct(ok)}%` }} /> : null}
        {skip > 0 ? <span className="bg-amber-400" style={{ width: `${pct(skip)}%` }} /> : null}
        {fail > 0 ? <span className="bg-red-500" style={{ width: `${pct(fail)}%` }} /> : null}
      </div>
      <p className="mt-1 text-[11px] leading-tight text-gray-500 dark:text-gray-400">
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {ok.toLocaleString()} delivered
        </span>
        {fail > 0 ? (
          <>
            {' · '}
            <span className="text-red-500">{fail.toLocaleString()} failed</span>
          </>
        ) : null}
        {skip > 0 ? (
          <>
            {' · '}
            <span className="text-amber-600 dark:text-amber-400">
              {skip.toLocaleString()} skipped
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}

function whenLines(broadcast: EmailBroadcast): [string, string] {
  const created = `Created ${timeAgo(broadcast.created || broadcast.modified)}`;
  if (broadcast.status === 'draft') {
    return [`Updated ${timeAgo(broadcast.modified || broadcast.created)}`, created];
  }
  if (broadcast.status === 'scheduled' && broadcast.scheduled_at) {
    return [`Scheduled ${timeAgo(broadcast.scheduled_at)}`, created];
  }
  if (broadcast.sent_at) {
    return [`Sent ${timeAgo(broadcast.sent_at)}`, created];
  }
  return [broadcast.status === 'queued' ? 'Queued' : '—', created];
}

export default function EmailBroadcastsSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [broadcasts, setBroadcasts] = useState<EmailBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<StatusGroup>('all');
  const [query, setQuery] = useState('');

  const canEdit = canManageEmailBroadcasts(user?.role);
  const composePath = '/dashboard/settings/email-broadcasts/compose';

  useEffect(() => {
    if (user && !canManageEmailBroadcasts(user.role)) {
      router.push('/dashboard/settings');
    }
  }, [user, router]);

  const effectiveUuid = resolveEmailScopeUuid({
    role: user?.role,
  });

  const loadBroadcasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await emailBroadcastsApi.list(effectiveUuid);
      setBroadcasts(rows);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load email campaigns';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUuid]);

  useEffect(() => {
    if (canEdit) {
      void loadBroadcasts();
    }
  }, [canEdit, loadBroadcasts]);

  const openCompose = (seed?: EmailCampaignComposerDraft) => {
    if (seed) writeComposerSeed(seed);
    router.push(composePath);
  };

  const groupCounts = useMemo(() => {
    const counts: Record<StatusGroup, number> = {
      all: broadcasts.length,
      drafts: 0,
      'in-flight': 0,
      completed: 0,
      failed: 0,
    };
    for (const broadcast of broadcasts) {
      const group = groupOf(broadcast.status);
      if (group !== 'all') counts[group] += 1;
    }
    return counts;
  }, [broadcasts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return broadcasts
      .filter((broadcast) => activeGroup === 'all' || groupOf(broadcast.status) === activeGroup)
      .filter((broadcast) => {
        if (!q) return true;
        const meta = STATUS_META[broadcast.status];
        const haystack = [
          broadcast.subject,
          broadcast.name,
          emailBroadcastAudienceLabel(broadcast.audience),
          formatEmailBroadcastCriteria(broadcast),
          meta?.label || broadcast.status,
          String(broadcast.id),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const at = new Date(a.created || a.modified || 0).getTime() || a.id;
        const bt = new Date(b.created || b.modified || 0).getTime() || b.id;
        return bt - at;
      });
  }, [broadcasts, activeGroup, query]);

  const hasActiveFilter = activeGroup !== 'all' || query.trim().length > 0;

  if (isAuthLoading) return <LoadingSkeleton />;
  if (!canEdit) return null;
  if (isLoading) return <LoadingSkeleton />;
  if (error && broadcasts.length === 0) {
    return <ErrorState message={error} onRetry={loadBroadcasts} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6366f1] via-[#4f46e5] to-[#4338ca] p-6 shadow-lg shadow-indigo-500/20 sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.9) 0, transparent 34%), radial-gradient(circle at 20% 100%, rgba(255,255,255,0.55) 0, transparent 28%)',
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100/80">
              Settings · Email campaigns
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Email campaigns
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-100/90">
              Compose marketing emails, target specific, filtered, or all eligible players, and
              track delivery — all in one place. Transactional emails live under Email Templates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadBroadcasts()}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => openCompose()}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-sm font-semibold text-[#4338ca] shadow-sm transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Icon d="M12 4v16m8-8H4" className="h-3.5 w-3.5" />
              Compose campaign
            </button>
          </div>
        </div>
      </header>

      {/* Status overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(GROUP_META) as StatusGroup[]).map((group) => {
          const meta = GROUP_META[group];
          const active = activeGroup === group;
          return (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                active
                  ? 'border-[#6366f1] bg-[#6366f1]/[0.06] shadow-sm ring-1 ring-[#6366f1]/30 dark:bg-[#6366f1]/15'
                  : 'border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700/80 dark:bg-gray-800 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.tint}`}>
                  <Icon d={meta.icon} className="h-5 w-5" />
                </span>
                <span className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                  {groupCounts[group].toLocaleString()}
                </span>
              </div>
              <p className="mt-2.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                {meta.label}
              </p>
            </button>
          );
        })}
      </div>

      {error && broadcasts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <span className="flex items-center gap-2">
            <Icon
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              className="h-4 w-4 shrink-0"
            />
            Could not refresh the list: {error}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadBroadcasts()}>
            Retry
          </Button>
        </div>
      ) : null}

      {/* Campaigns */}
      <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700/80">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campaigns</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {filtered.length === broadcasts.length
                ? `${broadcasts.length.toLocaleString()} total`
                : `Showing ${filtered.length.toLocaleString()} of ${broadcasts.length.toLocaleString()}`}
            </p>
          </div>
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by subject, name, or audience…"
            className="w-full sm:w-72"
          />
        </div>

        {hasActiveFilter ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-2.5 dark:border-gray-700/80">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Filtering
            </span>
            {activeGroup !== 'all' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6366f1]/10 px-2.5 py-1 text-xs font-medium text-[#4f46e5] dark:bg-[#6366f1]/20 dark:text-[#a5b4fc]">
                <Icon d={GROUP_META[activeGroup].icon} className="h-3.5 w-3.5" />
                {GROUP_META[activeGroup].label}
              </span>
            ) : null}
            {query.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                “{query.trim()}”
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setActiveGroup('all');
                setQuery('');
              }}
              className="ml-auto text-xs font-medium text-[#4f46e5] hover:underline dark:text-[#a5b4fc]"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          {broadcasts.length === 0 ? (
            <EmptyState onCompose={() => openCompose()} />
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                No campaigns match your filters
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Try a different search term or clear the filters to see everything.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setActiveGroup('all');
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Campaign', 'Status', 'Audience', 'Recipients', 'Delivery', 'When', ''].map(
                    (label, index) => (
                      <th
                        key={label || `actions-${index}`}
                        className={`py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 ${
                          index === 0
                            ? 'pl-5 pr-4'
                            : index === 6
                              ? 'pl-4 pr-5 text-right'
                              : 'px-4'
                        }`}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((broadcast) => {
                  const criteriaLabel = formatEmailBroadcastCriteria(broadcast);
                  const isDraft = groupOf(broadcast.status) === 'drafts';
                  const [primaryWhen, secondaryWhen] = whenLines(broadcast);
                  return (
                    <tr
                      key={broadcast.id}
                      className="group border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/70 dark:border-gray-700/60 dark:hover:bg-gray-900/30"
                    >
                      <td className="max-w-[340px] py-4 pl-5 pr-4">
                        <p className="flex items-center gap-2">
                          <span className="truncate font-semibold text-gray-900 dark:text-gray-50">
                            {broadcast.subject}
                          </span>
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-gray-400 dark:bg-gray-700/70 dark:text-gray-400">
                            #{broadcast.id}
                          </span>
                        </p>
                        {broadcast.name && broadcast.name !== broadcast.subject ? (
                          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                            <span className="text-gray-400 dark:text-gray-500">Internal:</span>{' '}
                            {broadcast.name}
                          </p>
                        ) : null}
                        {criteriaLabel ? (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-400 dark:text-gray-500">
                            <Icon
                              d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
                              className="h-3 w-3 shrink-0"
                            />
                            <span className="truncate">{criteriaLabel}</span>
                          </p>
                        ) : null}
                        {broadcast.last_error ? (
                          <p
                            className="mt-1 truncate text-xs text-red-500"
                            title={broadcast.last_error}
                          >
                            {broadcast.last_error}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={broadcast.status} />
                      </td>
                      <td className="px-4 py-4">
                        <AudienceChip audience={broadcast.audience} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                          {broadcast.total_recipients != null && broadcast.total_recipients > 0
                            ? broadcast.total_recipients.toLocaleString()
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <DeliveryStats broadcast={broadcast} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          {primaryWhen}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                          {secondaryWhen}
                        </p>
                        {broadcast.scheduled_at ? (
                          <p
                            className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500"
                            title={formatWhen(broadcast.scheduled_at)}
                          >
                            {formatWhen(broadcast.scheduled_at)}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-4 pl-4 pr-5 text-right">
                        <Button
                          type="button"
                          variant={isDraft ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => openCompose(broadcastToComposerSeed(broadcast))}
                        >
                          <Icon
                            d={
                              isDraft
                                ? 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                                : 'M13 3h7v7M21 3l-9 9m4-1v6a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h6'
                            }
                            className="mr-1.5 h-3.5 w-3.5"
                          />
                          {isDraft ? 'Edit draft' : 'Reuse'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#4338ca] text-white shadow-lg shadow-indigo-500/25">
        <Icon
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          className="h-6 w-6"
        />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
        No email campaigns yet
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Compose your first marketing email — pick specific players, build an audience with filters,
        or send to everyone eligible in this brand.
      </p>
      <Button type="button" size="sm" className="mt-5" onClick={onCompose}>
        <Icon d="M12 4v16m8-8H4" className="mr-1.5 h-3.5 w-3.5" />
        Compose campaign
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="rounded-2xl bg-gradient-to-br from-[#6366f1] via-[#4f46e5] to-[#4338ca] p-6 sm:p-7">
        <Skeleton className="h-3 w-40 bg-white/30" />
        <Skeleton className="mt-3 h-7 w-56 bg-white/30" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl bg-white/20" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-200/80 bg-white p-4 dark:border-gray-700/80 dark:bg-gray-800"
          >
            <Skeleton className="h-9 w-9" variant="circular" />
            <Skeleton className="mt-3 h-6 w-12" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-64" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-0 dark:border-gray-700/60">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
