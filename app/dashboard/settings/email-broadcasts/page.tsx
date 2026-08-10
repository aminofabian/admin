'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canManageEmailBroadcasts } from '@/lib/constants/roles';
import { emailBroadcastsApi } from '@/lib/api';
import {
  emailBroadcastAudienceLabel,
  emailBroadcastStatusTone,
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
import { Badge, Button } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import type {
  EmailBroadcast,
  EmailCampaignComposerDraft,
  EmailCampaignFilterField,
  EmailCampaignFilterOperator,
  EmailCampaignFilterRow,
  EmailCampaignRecipientMethod,
} from '@/types';

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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
  };
}

export default function EmailBroadcastsSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [broadcasts, setBroadcasts] = useState<EmailBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isAuthLoading) return <LoadingState />;
  if (!canEdit) return null;
  if (isLoading) return <LoadingState />;
  if (error && broadcasts.length === 0) {
    return <ErrorState message={error} onRetry={loadBroadcasts} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between dark:border-gray-700/80 dark:bg-gray-800">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Email campaigns
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Compose marketing emails with drafts, review, and targeting. Transactional emails live
            under Email Templates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadBroadcasts()}>
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => openCompose()}>
            Compose
          </Button>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Campaign history
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Drafts, status, recipients, criteria, and delivery counts
          </p>
        </div>

        <div className="overflow-x-auto px-5 py-2">
          {broadcasts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No campaigns yet. Compose your first broadcast.
            </p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Campaign
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Audience
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Recipients
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Delivered
                  </th>
                  <th className="py-2.5 pl-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    When
                  </th>
                  <th className="py-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((broadcast) => {
                  const criteriaLabel = formatEmailBroadcastCriteria(broadcast);
                  return (
                    <tr
                      key={broadcast.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-700/80"
                    >
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {broadcast.subject}
                        </p>
                        {criteriaLabel ? (
                          <p className="mt-0.5 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                            {criteriaLabel}
                          </p>
                        ) : null}
                        {broadcast.last_error ? (
                          <p className="mt-0.5 max-w-sm truncate text-xs text-red-500">
                            {broadcast.last_error}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge variant={emailBroadcastStatusTone(broadcast.status)}>
                          {broadcast.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-gray-600 dark:text-gray-300">
                        {emailBroadcastAudienceLabel(broadcast.audience)}
                      </td>
                      <td className="px-3 py-3.5 text-gray-600 dark:text-gray-300">
                        {broadcast.total_recipients ?? '—'}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {broadcast.successful_deliveries ?? 0}
                        </span>
                        {' / '}
                        <span className="text-red-500">{broadcast.failed_deliveries ?? 0}</span>
                        {' / '}
                        <span className="text-amber-600 dark:text-amber-400">
                          {broadcast.skipped_deliveries ?? 0}
                        </span>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                          ok / fail / skip
                        </p>
                      </td>
                      <td className="py-3.5 pl-4 text-xs text-gray-600 dark:text-gray-300">
                        <p>Sent: {formatWhen(broadcast.sent_at)}</p>
                        <p className="mt-0.5">Scheduled: {formatWhen(broadcast.scheduled_at)}</p>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => openCompose(broadcastToComposerSeed(broadcast))}
                        >
                          Reuse
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
