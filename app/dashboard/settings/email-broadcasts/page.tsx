'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canManageEmailBroadcasts } from '@/lib/constants/roles';
import { emailBroadcastsApi, emailCampaignTemplatesApi } from '@/lib/api';
import {
  emailBroadcastStatusTone,
  formatEmailBroadcastCriteria,
  resolveEmailBroadcastCriteria,
} from '@/lib/constants/email-broadcasts';
import { createEmptyEmailCampaignDraft } from '@/lib/constants/email-campaign-composer';
import { writeComposerSeed } from '@/lib/utils/email-campaign-draft';
import { migrateLegacyFiltersToRows } from '@/lib/utils/email-campaign-filters';
import { normalizeUsStateCode } from '@/lib/utils/us-states';
import { resolveEmailScopeUuid } from '@/lib/utils/project-uuid';
import { Badge, Button, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import type {
  EmailBroadcast,
  EmailCampaignComposerDraft,
  EmailCampaignTemplate,
} from '@/types';

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function templateToComposerSeed(template: EmailCampaignTemplate): EmailCampaignComposerDraft {
  return {
    ...createEmptyEmailCampaignDraft(),
    internal_name: template.name,
    subject: template.subject,
    html_body: template.html_body,
    template_id: template.id,
  };
}

function broadcastToComposerSeed(broadcast: EmailBroadcast): EmailCampaignComposerDraft {
  const filters = resolveEmailBroadcastCriteria(broadcast);
  const userIds = Array.isArray(broadcast.selected_user_ids) ? broadcast.selected_user_ids : [];
  const isSelected = broadcast.audience === 'selected' || userIds.length > 0;
  const hasFilters =
    filters.deposit_min != null ||
    filters.deposit_max != null ||
    filters.ssn_verified === true ||
    filters.ssn_verified === false ||
    (Array.isArray(filters.states) && filters.states.length > 0);

  const seed = createEmptyEmailCampaignDraft();
  return {
    ...seed,
    internal_name: broadcast.subject,
    subject: broadcast.subject,
    html_body: broadcast.html_body,
    recipient_method: isSelected ? 'specific' : hasFilters ? 'filtered' : 'all',
    selected_players: userIds.map((id) => ({
      id,
      username: `User #${id}`,
      email: '',
    })),
    filter_rows: migrateLegacyFiltersToRows({
      deposit_min: filters.deposit_min != null ? String(filters.deposit_min) : '',
      deposit_max: filters.deposit_max != null ? String(filters.deposit_max) : '',
      ssn_filter:
        filters.ssn_verified === true
          ? 'verified'
          : filters.ssn_verified === false
            ? 'unverified'
            : 'any',
      states: Array.isArray(filters.states)
        ? filters.states
            .map((state) => normalizeUsStateCode(state))
            .filter((code): code is string => Boolean(code))
        : [],
    }),
    template_id: broadcast.template_id ?? null,
  };
}

export default function EmailBroadcastsSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const [broadcasts, setBroadcasts] = useState<EmailBroadcast[]>([]);
  const [templates, setTemplates] = useState<EmailCampaignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);
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

  const loadTemplates = useCallback(async () => {
    try {
      const rows = await emailCampaignTemplatesApi.list(effectiveUuid);
      setTemplates(rows);
    } catch {
      setTemplates([]);
    }
  }, [effectiveUuid]);

  const loadBroadcasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rows] = await Promise.all([
        emailBroadcastsApi.list(effectiveUuid),
        loadTemplates(),
      ]);
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
  }, [effectiveUuid, loadTemplates]);

  useEffect(() => {
    if (canEdit) {
      void loadBroadcasts();
    }
  }, [canEdit, loadBroadcasts]);

  const openCompose = (seed?: EmailCampaignComposerDraft) => {
    if (seed) writeComposerSeed(seed);
    router.push(composePath);
  };

  const handleDeleteTemplate = async (template: EmailCampaignTemplate) => {
    setDeletingTemplateId(template.id);
    try {
      await emailCampaignTemplatesApi.remove(template.id, effectiveUuid);
      setTemplates((prev) => prev.filter((row) => row.id !== template.id));
      addToast({
        type: 'success',
        title: 'Template deleted',
        description: template.name,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete template',
      });
    } finally {
      setDeletingTemplateId(null);
    }
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
            Campaign templates
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Saved subject and HTML — open in the composer to send another lot
          </p>
        </div>

        <div className="overflow-x-auto px-5 py-2">
          {templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No saved templates yet. Use Save Draft in the composer to create one.
            </p>
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Name
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Subject
                  </th>
                  <th className="py-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-700/80"
                  >
                    <td className="py-3.5 pr-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{template.name}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="max-w-md truncate text-xs text-gray-600 dark:text-gray-300">
                        {template.subject}
                      </p>
                    </td>
                    <td className="py-3.5 pl-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => openCompose(templateToComposerSeed(template))}
                        >
                          Use
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          isLoading={deletingTemplateId === template.id}
                          disabled={deletingTemplateId === template.id}
                          onClick={() => void handleDeleteTemplate(template)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campaign history</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Status, recipients, criteria, and delivery counts
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
                      <td className="px-3 py-3.5 capitalize text-gray-600 dark:text-gray-300">
                        {broadcast.audience}
                      </td>
                      <td className="px-3 py-3.5 text-gray-600 dark:text-gray-300">
                        {broadcast.total_recipients}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {broadcast.successful_deliveries}
                        </span>
                        {' / '}
                        <span className="text-red-500">{broadcast.failed_deliveries}</span>
                        {' / '}
                        <span className="text-amber-600 dark:text-amber-400">
                          {broadcast.skipped_deliveries}
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
                          Reuse template
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
