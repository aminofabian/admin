'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canManageEmailBroadcasts } from '@/lib/constants/roles';
import { emailBroadcastsApi } from '@/lib/api';
import {
  emailBroadcastAudienceLabel,
  emailBroadcastFailureNotice,
  canCancelEmailBroadcast,
  canEditEmailBroadcast,
  canRetryFailedEmailBroadcast,
  canSendEmailBroadcast,
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
import {
  Button,
  ConfirmModal,
  Drawer,
  DropdownMenu,
  DropdownMenuItem,
  SearchInput,
  Skeleton,
  useToast,
} from '@/components/ui';
import { ErrorState } from '@/components/features';
import type {
  EmailBroadcast,
  EmailCampaignComposerDraft,
  EmailCampaignFilterField,
  EmailCampaignFilterOperator,
  EmailCampaignFilterRow,
  EmailCampaignRecipientMethod,
} from '@/types';

type StatusGroup = 'all' | 'drafts' | 'in-flight' | 'completed' | 'failed' | 'cancelled';

const STATUS_GROUPS: { key: StatusGroup; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'in-flight', label: 'In queue' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_META: Record<
  string,
  { label: string; group: StatusGroup; chip: string; dot: string }
> = {
  draft: {
    label: 'Draft',
    group: 'drafts',
    chip: 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  queued: {
    label: 'Queued',
    group: 'in-flight',
    chip: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  scheduled: {
    label: 'Scheduled',
    group: 'in-flight',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  sending: {
    label: 'Sending',
    group: 'in-flight',
    chip: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    dot: 'bg-sky-500 animate-pulse',
  },
  completed: {
    label: 'Completed',
    group: 'completed',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  failed: {
    label: 'Failed',
    group: 'failed',
    chip: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-500',
  },
  cancelled: {
    label: 'Cancelled',
    group: 'cancelled',
    chip: 'bg-stone-100 text-stone-700 dark:bg-stone-800/70 dark:text-stone-300',
    dot: 'bg-stone-500',
  },
};

const AUDIENCE_ICON: Record<string, { d: string; tint: string }> = {
  specific: {
    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    tint: 'bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  },
  filtered: {
    d: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    tint: 'bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  },
  all_eligible: {
    d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  selected: {
    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    tint: 'bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  },
  all: {
    d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  whitelabel: {
    d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
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

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status] || {
    label: status,
    chip: 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300',
    dot: 'bg-gray-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function AudienceChip({ audience }: { audience: string }) {
  const icon = AUDIENCE_ICON[audience] || AUDIENCE_ICON.specific;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${icon.tint}`}
    >
      <Icon d={icon.d} className="h-3 w-3" />
      {emailBroadcastAudienceLabel(audience)}
    </span>
  );
}

function DeliveryStats({ broadcast }: { broadcast: EmailBroadcast }) {
  const ok = broadcast.successful_deliveries ?? 0;
  const fail = broadcast.failed_deliveries ?? 0;
  const skip = broadcast.skipped_deliveries ?? 0;
  const bounced = broadcast.bounced_deliveries ?? 0;
  const complaints = broadcast.complaint_deliveries ?? 0;
  const delivered = ok + fail + skip;
  const total = broadcast.total_recipients ?? 0;
  const showSentVsFailed = ok > 0 && fail > 0;

  return (
    <div className="min-w-[180px]">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {total > 0 ? (
          <>
            <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {total.toLocaleString()}
            </span>{' '}
            <span className="text-gray-400 dark:text-gray-500">recipients</span>
          </>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        )}
      </p>
      {delivered > 0 || bounced > 0 || complaints > 0 ? (
        <>
          {delivered > 0 ? (
            <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              {ok > 0 ? (
                <span className="bg-emerald-500" style={{ width: `${(ok / delivered) * 100}%` }} />
              ) : null}
              {skip > 0 ? (
                <span className="bg-amber-400" style={{ width: `${(skip / delivered) * 100}%` }} />
              ) : null}
              {fail > 0 ? (
                <span className="bg-red-500" style={{ width: `${(fail / delivered) * 100}%` }} />
              ) : null}
            </div>
          ) : null}
          <p className="mt-1 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
            {showSentVsFailed ? (
              <>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {ok.toLocaleString()}
                </span>{' '}
                sent vs{' '}
                <span className="font-medium text-red-500">{fail.toLocaleString()}</span> failed
              </>
            ) : (
              <>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {ok.toLocaleString()}
                </span>{' '}
                sent
                {fail > 0 ? (
                  <>
                    {' · '}
                    <span className="font-medium text-red-500">{fail.toLocaleString()}</span> failed
                  </>
                ) : null}
              </>
            )}
            {skip > 0 ? (
              <>
                {' · '}
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {skip.toLocaleString()}
                </span>{' '}
                skipped
              </>
            ) : null}
            {bounced > 0 ? (
              <>
                {' · '}
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {bounced.toLocaleString()}
                </span>{' '}
                bounced
              </>
            ) : null}
            {complaints > 0 ? (
              <>
                {' · '}
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  {complaints.toLocaleString()}
                </span>{' '}
                complaints
              </>
            ) : null}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          {broadcast.status === 'draft'
            ? 'Not sent yet'
            : broadcast.status === 'queued'
              ? 'In queue'
              : broadcast.status === 'scheduled'
                ? 'Scheduled'
                : broadcast.status === 'sending'
                  ? 'Sending…'
                  : broadcast.status === 'cancelled'
                    ? 'Cancelled — remaining queued were skipped'
                    : 'No deliveries'}
        </p>
      )}
    </div>
  );
}

function whenLines(broadcast: EmailBroadcast): [string, string] {
  const created = `Created ${timeAgo(broadcast.created || broadcast.modified)}`;
  if (broadcast.status === 'draft') {
    return [`Updated ${timeAgo(broadcast.modified || broadcast.created)}`, created];
  }
  if (broadcast.status === 'cancelled') {
    return [`Cancelled ${timeAgo(broadcast.modified || broadcast.created)}`, created];
  }
  if (broadcast.status === 'scheduled' && broadcast.scheduled_at) {
    return [`Scheduled ${timeAgo(broadcast.scheduled_at)}`, created];
  }
  if (broadcast.sent_at) {
    return [`Sent ${timeAgo(broadcast.sent_at)}`, created];
  }
  return [broadcast.status === 'queued' ? 'Queued' : '—', created];
}

type PendingCampaignAction = {
  type: 'send' | 'cancel' | 'retry';
  broadcast: EmailBroadcast;
};

function actionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function isCancelConflict(error: unknown): boolean {
  const message = actionErrorMessage(error, '').toLowerCase();
  const status =
    error && typeof error === 'object' && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined;
  return (
    status === 409 ||
    status === '409' ||
    message.includes('409') ||
    message.includes('already completed') ||
    message.includes('already failed') ||
    message.includes('already cancelled') ||
    (message.includes('conflict') && message.includes('cancel'))
  );
}

export default function EmailBroadcastsSettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [broadcasts, setBroadcasts] = useState<EmailBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<StatusGroup>('all');
  const [query, setQuery] = useState('');
  const [detailBroadcast, setDetailBroadcast] = useState<EmailBroadcast | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingCampaignAction | null>(null);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

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

  const runPendingAction = async () => {
    if (!pendingAction) return;
    const { type, broadcast } = pendingAction;
    setActionBusyId(broadcast.id);
    try {
      if (type === 'send') {
        await emailBroadcastsApi.send(broadcast.id);
        addToast({ type: 'success', title: 'Campaign queued', description: 'The draft is now sending.' });
      } else if (type === 'cancel') {
        const result = await emailBroadcastsApi.cancel(broadcast.id);
        const skipped = result.skipped_queued ?? 0;
        addToast({
          type: 'success',
          title: 'Campaign cancelled',
          description:
            skipped > 0
              ? `${skipped.toLocaleString()} queued recipients were skipped. Already-sent stay sent.`
              : result.message ||
                (broadcast.status === 'sending'
                  ? 'Already-sent recipients stay sent. Remaining queued recipients were skipped.'
                  : 'This campaign will not send.'),
        });
      } else {
        await emailBroadcastsApi.retryFailed(broadcast.id);
        addToast({
          type: 'success',
          title: 'Retry queued',
          description: 'Only failed recipients will be retried. Recipients already marked sent will not be emailed again.',
        });
      }
      setPendingAction(null);
      await loadBroadcasts();
    } catch (err) {
      addToast({
        type: 'error',
        title:
          type === 'cancel' && isCancelConflict(err)
            ? 'Campaign already finished'
            : type === 'send'
              ? 'Could not send'
              : type === 'cancel'
                ? 'Could not cancel'
                : 'Could not retry failed',
        description:
          type === 'cancel' && isCancelConflict(err)
            ? 'Cancel is only allowed while a campaign is draft, queued, scheduled, or sending.'
            : actionErrorMessage(err, 'Please try again.'),
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const openRow = (broadcast: EmailBroadcast, seed: EmailCampaignComposerDraft) => {
    if (canEditEmailBroadcast(broadcast.status)) {
      openCompose(seed);
      return;
    }
    setDetailBroadcast(broadcast);
  };

  const groupCounts = useMemo(() => {
    const counts: Record<StatusGroup, number> = {
      all: broadcasts.length,
      drafts: 0,
      'in-flight': 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
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

  const isFiltering = query.trim().length > 0 || (activeGroup !== 'all' && filtered.length !== broadcasts.length);
  const liveDetail =
    detailBroadcast == null
      ? null
      : broadcasts.find((row) => row.id === detailBroadcast.id) || detailBroadcast;
  const confirmCopy = pendingAction
    ? pendingAction.type === 'send'
      ? {
          title: 'Send this campaign?',
          description: 'The draft will be queued and start sending to eligible recipients.',
          confirmText: 'Send',
          variant: 'info' as const,
        }
      : pendingAction.type === 'cancel'
        ? {
            title: 'Cancel this campaign?',
            description:
              pendingAction.broadcast.status === 'sending'
                ? 'Already-sent recipients stay sent. Remaining queued recipients will be skipped.'
                : pendingAction.broadcast.status === 'draft'
                  ? 'This draft will be cancelled and will not send.'
                  : 'This campaign will stop. Remaining queued recipients will be skipped.',
            confirmText: 'Cancel campaign',
            variant: 'danger' as const,
          }
        : {
            title: 'Retry failed deliveries?',
            description:
              'Only recipients marked failed will be retried. Recipients already marked sent will not be emailed again.',
            confirmText: 'Retry failed',
            variant: 'warning' as const,
          }
    : null;

  const clearFilters = () => {
    setActiveGroup('all');
    setQuery('');
  };

  if (isAuthLoading) return <LoadingSkeleton />;
  if (!canEdit) return null;
  if (isLoading) return <LoadingSkeleton />;
  if (error && broadcasts.length === 0) {
    return <ErrorState message={error} onRetry={loadBroadcasts} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            Settings · Email campaigns
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-2xl">
            Email campaigns
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Compose, target, and track marketing emails for players in this brand.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            title="Refresh campaigns"
            onClick={() => void loadBroadcasts()}
            className="rounded-lg border border-gray-200 p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/40 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Icon
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              className="h-4 w-4"
            />
          </button>
          <Button type="button" size="sm" onClick={() => openCompose()}>
            <Icon d="M12 4v16m8-8H4" className="mr-1.5 h-3.5 w-3.5" />
            Compose campaign
          </Button>
        </div>
      </header>

      {/* Filter + search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/60 p-1 shadow-sm dark:border-gray-700/80 dark:bg-gray-800/60">
          {STATUS_GROUPS.map((group) => {
            const active = activeGroup === group.key;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveGroup(group.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/50 ${
                  active
                    ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <span>{group.label}</span>
                <span
                  className={`tabular-nums ${
                    active
                      ? 'text-white/50 dark:text-gray-900/50'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {groupCounts[group.key]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex w-full items-center gap-2 lg:w-auto">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full lg:w-64"
          />
          {isFiltering ? (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {error && broadcasts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
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
      <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5 dark:border-gray-700/80">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Campaigns
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {filtered.length === broadcasts.length
              ? `${broadcasts.length.toLocaleString()} total`
              : `Showing ${filtered.length.toLocaleString()} of ${broadcasts.length.toLocaleString()}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          {broadcasts.length === 0 ? (
            <EmptyState onCompose={() => openCompose()} />
          ) : filtered.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                No campaigns match
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Try a different search or switch the status filter.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/80">
                  {['Campaign', 'Status', 'Audience', 'Delivery', 'When', ''].map((label, index) => (
                    <th
                      key={label || `actions-${index}`}
                      className={`py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${
                        index === 0 ? 'pl-4 pr-3' : index === 5 ? 'pl-3 pr-3 text-right' : 'px-3'
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((broadcast) => {
                  const criteriaLabel = formatEmailBroadcastCriteria(broadcast);
                  const deliveryIssue = emailBroadcastFailureNotice(broadcast);
                  const isDraft = canEditEmailBroadcast(broadcast.status);
                  const canSend = canSendEmailBroadcast(broadcast.status);
                  const canCancel = canCancelEmailBroadcast(broadcast.status);
                  const canRetry = canRetryFailedEmailBroadcast(
                    broadcast.status,
                    broadcast.failed_deliveries,
                  );
                  const seed = broadcastToComposerSeed(broadcast);
                  const [primaryWhen, secondaryWhen] = whenLines(broadcast);
                  const busy = actionBusyId === broadcast.id;
                  return (
                    <tr
                      key={broadcast.id}
                      onClick={() => openRow(broadcast, seed)}
                      title={isDraft ? 'Edit this draft' : 'View campaign details'}
                      className="group cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/70 dark:border-gray-700/40 dark:hover:bg-gray-900/30"
                    >
                      <td className="max-w-[320px] py-3 pl-4 pr-3">
                        <p className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-gray-900 transition-colors group-hover:text-[#4f46e5] group-hover:underline group-hover:decoration-[#4f46e5]/30 group-hover:underline-offset-2 dark:text-gray-50 dark:group-hover:text-[#a5b4fc]">
                            {broadcast.subject}
                          </span>
                          <span className="shrink-0 text-[10px] tabular-nums text-gray-300 dark:text-gray-600">
                            #{broadcast.id}
                          </span>
                        </p>
                        {broadcast.name && broadcast.name !== broadcast.subject ? (
                          <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
                            {broadcast.name}
                          </p>
                        ) : null}
                        {criteriaLabel ? (
                          <p
                            className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-400 dark:text-gray-500"
                            title={criteriaLabel}
                          >
                            <Icon d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" className="h-3 w-3 shrink-0" />
                            <span className="truncate">{criteriaLabel}</span>
                          </p>
                        ) : null}
                        {deliveryIssue ? (
                          <p
                            className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md bg-amber-50/90 px-1.5 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950/35 dark:text-amber-300"
                            title={deliveryIssue.detail || deliveryIssue.label}
                          >
                            <Icon
                              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                              className="h-3 w-3 shrink-0 opacity-80"
                            />
                            <span className="truncate">{deliveryIssue.label}</span>
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <StatusChip status={broadcast.status} />
                      </td>
                      <td className="px-3 py-3">
                        <AudienceChip audience={broadcast.audience} />
                      </td>
                      <td className="px-3 py-3">
                        <DeliveryStats broadcast={broadcast} />
                      </td>
                      <td className="px-3 py-3">
                        <p
                          className="text-xs font-medium text-gray-700 dark:text-gray-200"
                          title={formatWhen(broadcast.sent_at || broadcast.scheduled_at || broadcast.modified)}
                        >
                          {primaryWhen}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                          {secondaryWhen}
                        </p>
                      </td>
                      <td className="py-3 pl-3 pr-3 text-right">
                        <span onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu
                            trigger={
                              <button
                                type="button"
                                aria-label="Campaign actions"
                                className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-gray-300 group-hover:opacity-100 group-focus-within:opacity-100 dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
                              >
                                <Icon d="M12 5h.01M12 12h.01M12 19h.01" className="h-4 w-4" />
                              </button>
                            }
                          >
                            {isDraft ? (
                              <DropdownMenuItem onClick={() => openCompose(seed)}>
                                <Icon
                                  d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  className="mr-2 inline h-3.5 w-3.5 text-gray-400"
                                />
                                Edit
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setDetailBroadcast(broadcast)}>
                                <Icon
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  className="mr-2 inline h-3.5 w-3.5 text-gray-400"
                                />
                                View details
                              </DropdownMenuItem>
                            )}
                            {canSend ? (
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() => setPendingAction({ type: 'send', broadcast })}
                              >
                                Send
                              </DropdownMenuItem>
                            ) : null}
                            {canCancel ? (
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() => setPendingAction({ type: 'cancel', broadcast })}
                              >
                                Cancel
                              </DropdownMenuItem>
                            ) : null}
                            {canRetry ? (
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() => setPendingAction({ type: 'retry', broadcast })}
                              >
                                Retry failed
                              </DropdownMenuItem>
                            ) : null}
                            {!isDraft ? (
                              <DropdownMenuItem onClick={() => openCompose(seed)}>
                                <Icon
                                  d="M13 3h7v7M21 3l-9 9m4-1v6a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h6"
                                  className="mr-2 inline h-3.5 w-3.5 text-gray-400"
                                />
                                Reuse
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenu>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <Drawer
        isOpen={liveDetail != null}
        onClose={() => setDetailBroadcast(null)}
        title={liveDetail?.subject || 'Campaign'}
        subtitle={liveDetail ? `#${liveDetail.id} · ${STATUS_META[liveDetail.status]?.label || liveDetail.status}` : undefined}
        size="md"
        footer={
          liveDetail ? (
            <div className="flex flex-wrap justify-end gap-2">
              {canEditEmailBroadcast(liveDetail.status) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openCompose(broadcastToComposerSeed(liveDetail))}
                >
                  Edit
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openCompose(broadcastToComposerSeed(liveDetail))}
                >
                  Reuse
                </Button>
              )}
              {canSendEmailBroadcast(liveDetail.status) ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPendingAction({ type: 'send', broadcast: liveDetail })}
                >
                  Send
                </Button>
              ) : null}
              {canCancelEmailBroadcast(liveDetail.status) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => setPendingAction({ type: 'cancel', broadcast: liveDetail })}
                >
                  Cancel
                </Button>
              ) : null}
              {canRetryFailedEmailBroadcast(liveDetail.status, liveDetail.failed_deliveries) ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPendingAction({ type: 'retry', broadcast: liveDetail })}
                >
                  Retry failed
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {liveDetail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={liveDetail.status} />
              <AudienceChip audience={liveDetail.audience} />
            </div>
            {liveDetail.name && liveDetail.name !== liveDetail.subject ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{liveDetail.name}</p>
            ) : null}
            <DeliveryStats broadcast={liveDetail} />
            {emailBroadcastFailureNotice(liveDetail) ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {emailBroadcastFailureNotice(liveDetail)?.label}
              </p>
            ) : (liveDetail.successful_deliveries ?? 0) > 0 &&
              (liveDetail.failed_deliveries ?? 0) > 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Partial send: {(liveDetail.successful_deliveries ?? 0).toLocaleString()} sent vs{' '}
                {(liveDetail.failed_deliveries ?? 0).toLocaleString()} failed.
              </p>
            ) : null}
            {formatEmailBroadcastCriteria(liveDetail) ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatEmailBroadcastCriteria(liveDetail)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <ConfirmModal
        isOpen={pendingAction != null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void runPendingAction()}
        title={confirmCopy?.title || ''}
        description={confirmCopy?.description || ''}
        confirmText={confirmCopy?.confirmText}
        variant={confirmCopy?.variant}
        isLoading={actionBusyId != null}
      />
    </div>
  );
}

function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-500">
        <Icon
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          className="h-5 w-5"
        />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-50">
        No email campaigns yet
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Compose your first marketing email — target specific players, build an audience with
        filters, or reach everyone eligible in this brand.
      </p>
      <Button type="button" size="sm" className="mt-4" onClick={onCompose}>
        <Icon d="M12 4v16m8-8H4" className="mr-1.5 h-3.5 w-3.5" />
        Compose campaign
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <div>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-2 h-6 w-52" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-700/80">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-gray-50 px-4 py-3.5 last:border-0 dark:border-gray-700/40"
          >
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-1.5 h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
