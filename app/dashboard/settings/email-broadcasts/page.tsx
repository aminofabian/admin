'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES, canManageEmailBroadcasts } from '@/lib/constants/roles';
import { emailBroadcastsApi } from '@/lib/api';
import { emailBroadcastStatusTone } from '@/lib/constants/email-broadcasts';
import { resolveEmailScopeUuid } from '@/lib/utils/project-uuid';
import { Badge, Button, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import { EmailBroadcastComposeDrawer } from '@/components/features/email-broadcast-compose-drawer';
import { ProjectScopePicker } from '@/components/features/project-scope-picker';
import type { CreateEmailBroadcastRequest, EmailBroadcast } from '@/types';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [scopeUuid, setScopeUuid] = useState('');

  const canEdit = canManageEmailBroadcasts(user?.role);
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  useEffect(() => {
    if (user?.role === USER_ROLES.AGENT || (user && !canManageEmailBroadcasts(user.role))) {
      router.push('/dashboard/settings');
    }
  }, [user, router]);

  const effectiveUuid = resolveEmailScopeUuid({
    role: user?.role,
    explicitUuid: isSuperadmin ? scopeUuid : undefined,
  });

  const loadBroadcasts = useCallback(async () => {
    if (isSuperadmin && !scopeUuid.trim()) {
      setBroadcasts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

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
  }, [effectiveUuid, isSuperadmin, scopeUuid]);

  useEffect(() => {
    if (canEdit) {
      void loadBroadcasts();
    }
  }, [canEdit, loadBroadcasts]);

  const handleCreate = async (data: CreateEmailBroadcastRequest) => {
    setIsSaving(true);
    try {
      const payload: CreateEmailBroadcastRequest = {
        ...data,
        ...(isSuperadmin && scopeUuid.trim() && !data.whitelabel_admin_uuid
          ? { whitelabel_admin_uuid: scopeUuid.trim() }
          : {}),
      };
      const result = await emailBroadcastsApi.create(payload);
      setBroadcasts((prev) => [result.broadcast, ...prev.filter((row) => row.id !== result.broadcast.id)]);
      setIsComposeOpen(false);
      addToast({
        type: 'success',
        title: payload.scheduled_at ? 'Campaign scheduled' : 'Campaign queued',
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

  if (isAuthLoading) return <LoadingState />;
  if (!canEdit) return null;

  if (isSuperadmin && !scopeUuid.trim()) {
    return (
      <div className="space-y-6 pb-12">
        <header>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Email campaigns</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Compose, schedule, and review marketing email broadcasts.
          </p>
        </header>
        <ProjectScopePicker value={scopeUuid} onChange={setScopeUuid} required />
      </div>
    );
  }

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
            Send or schedule marketing emails to opted-in players. Transactional emails are configured
            under Email Templates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadBroadcasts()}>
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setIsComposeOpen(true)}>
            Compose
          </Button>
        </div>
      </header>

      {isSuperadmin ? (
        <ProjectScopePicker value={scopeUuid} onChange={setScopeUuid} required />
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campaign history</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Status, recipients, and delivery counts
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
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((broadcast) => (
                  <tr
                    key={broadcast.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-700/80"
                  >
                    <td className="py-3.5 pr-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{broadcast.subject}</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <EmailBroadcastComposeDrawer
        isOpen={isComposeOpen}
        isSaving={isSaving}
        isSuperadmin={isSuperadmin}
        defaultScopeUuid={scopeUuid}
        onClose={() => setIsComposeOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
