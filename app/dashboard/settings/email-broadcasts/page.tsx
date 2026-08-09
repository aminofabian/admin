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
import { resolveEmailScopeUuid } from '@/lib/utils/project-uuid';
import { Badge, Button, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import { EmailBroadcastComposeDrawer } from '@/components/features/email-broadcast-compose-drawer';
import type {
  CreateEmailBroadcastRequest,
  EmailBroadcast,
  EmailBroadcastComposeDraft,
  EmailCampaignTemplate,
} from '@/types';

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function EmailBroadcastsSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const [broadcasts, setBroadcasts] = useState<EmailBroadcast[]>([]);
  const [templates, setTemplates] = useState<EmailCampaignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTemplate, setComposeTemplate] = useState<EmailCampaignTemplate | null>(null);
  const [composeDraft, setComposeDraft] = useState<EmailBroadcastComposeDraft | null>(null);

  const canEdit = canManageEmailBroadcasts(user?.role);

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
      // Templates are additive; keep campaigns usable if this endpoint is still landing.
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

  const openCompose = (template?: EmailCampaignTemplate | null) => {
    setComposeDraft(null);
    setComposeTemplate(template ?? null);
    setIsComposeOpen(true);
  };

  const openReuseCampaign = (broadcast: EmailBroadcast) => {
    const filters = resolveEmailBroadcastCriteria(broadcast);
    setComposeTemplate(null);
    setComposeDraft({
      subject: broadcast.subject,
      html_body: broadcast.html_body,
      audience: broadcast.audience,
      user_ids: Array.isArray(broadcast.selected_user_ids) ? broadcast.selected_user_ids : [],
      deposit_min: filters.deposit_min,
      deposit_max: filters.deposit_max,
      ssn_verified: filters.ssn_verified,
      states: filters.states,
      template_id: broadcast.template_id,
      template_name: broadcast.subject,
    });
    setIsComposeOpen(true);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
    setComposeTemplate(null);
    setComposeDraft(null);
  };

  const handleCreate = async (data: CreateEmailBroadcastRequest) => {
    setIsSaving(true);
    try {
      const result = await emailBroadcastsApi.create(data);
      setBroadcasts((prev) => [result.broadcast, ...prev.filter((row) => row.id !== result.broadcast.id)]);
      closeCompose();
      addToast({
        type: 'success',
        title: data.scheduled_at ? 'Campaign scheduled' : 'Campaign queued',
        description: result.message || result.broadcast.subject,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'detail' in err
            ? String((err as { detail: unknown }).detail)
            : typeof err === 'object' && err && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Failed to create campaign';
      addToast({ type: 'error', title: 'Send failed', description: message });
      throw err;
    } finally {
      setIsSaving(false);
    }
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
    <div className="space-y-8 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Email campaigns</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Send or schedule marketing emails with reusable templates and audience criteria.
            Transactional emails are configured under Email Templates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadBroadcasts()}>
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => openCompose()}>
            Compose
          </Button>
        </div>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Campaign templates
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Save subject and HTML body once, reuse across campaigns
          </p>
        </div>

        <div className="overflow-x-auto px-5 py-2">
          {templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No saved templates yet. Compose a campaign and use &quot;Save as template&quot;.
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
                          onClick={() => openCompose(template)}
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

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
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
                          onClick={() => openReuseCampaign(broadcast)}
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

      <EmailBroadcastComposeDrawer
        isOpen={isComposeOpen}
        isSaving={isSaving}
        isSuperadmin={false}
        templates={templates}
        initialTemplate={composeTemplate}
        initialDraft={composeDraft}
        onClose={closeCompose}
        onSubmit={handleCreate}
        onTemplatesChange={() => void loadTemplates()}
      />
    </div>
  );
}
