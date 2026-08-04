'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES, canManageEmailTemplates } from '@/lib/constants/roles';
import { emailTemplatesApi } from '@/lib/api';
import {
  displayEmailTemplateLabel,
  resolveEmailTemplateVariables,
} from '@/lib/constants/email-templates';
import { resolveEmailScopeUuid } from '@/lib/utils/project-uuid';
import { Button, Switch, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import { EmailTemplateEditorDrawer } from '@/components/features/email-template-editor-drawer';
import { ProjectScopePicker } from '@/components/features/project-scope-picker';
import type { EmailTemplate } from '@/types';

function TemplateRow({
  template,
  isSaving,
  onEdit,
  onToggleEnabled,
}: {
  template: EmailTemplate;
  isSaving: boolean;
  onEdit: (template: EmailTemplate) => void;
  onToggleEnabled: (template: EmailTemplate, enabled: boolean) => Promise<void>;
}) {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  const placeholders = resolveEmailTemplateVariables(template.required_placeholders || []).slice(0, 5);

  const handleToggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      await onToggleEnabled(template, enabled);
      addToast({
        type: 'success',
        title: enabled ? 'Template enabled' : 'Template disabled',
        description: displayEmailTemplateLabel(template),
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-gray-100 last:border-0 dark:border-gray-700/80">
      <td className="py-3.5 pr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {displayEmailTemplateLabel(template)}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{template.action}</p>
        {placeholders.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {placeholders.map((variable) => (
              <span
                key={variable.key}
                className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                {variable.key}
              </span>
            ))}
            {(template.required_placeholders?.length || 0) > placeholders.length ? (
              <span className="text-[10px] text-gray-400">
                +{(template.required_placeholders?.length || 0) - placeholders.length}
              </span>
            ) : null}
          </div>
        ) : null}
      </td>
      <td className="hidden px-3 py-3.5 md:table-cell">
        <p className="max-w-xs truncate text-xs text-gray-600 dark:text-gray-300">{template.subject}</p>
      </td>
      <td className="px-3 py-3.5">
        <Switch
          checked={template.is_enabled}
          onChange={handleToggle}
          disabled={busy || isSaving}
          tone="emerald"
        />
      </td>
      <td className="py-3.5 pl-4 text-right">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={() => onEdit(template)}
        >
          Edit
        </Button>
      </td>
    </tr>
  );
}

export default function EmailTemplatesSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [scopeUuid, setScopeUuid] = useState('');

  const canEdit = canManageEmailTemplates(user?.role);
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  useEffect(() => {
    if (
      user?.role === USER_ROLES.AGENT ||
      (user && !canManageEmailTemplates(user.role))
    ) {
      router.push('/dashboard/settings');
    }
  }, [user, router]);

  const effectiveUuid = resolveEmailScopeUuid({
    role: user?.role,
    explicitUuid: isSuperadmin ? scopeUuid : undefined,
  });

  const loadTemplates = useCallback(async () => {
    if (isSuperadmin && !scopeUuid.trim()) {
      setTemplates([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const rows = await emailTemplatesApi.list(effectiveUuid);
      setTemplates(rows);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load email templates';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUuid, isSuperadmin, scopeUuid]);

  useEffect(() => {
    if (canEdit) {
      void loadTemplates();
    }
  }, [canEdit, loadTemplates]);

  const upsertTemplate = useCallback((updated: EmailTemplate) => {
    setTemplates((prev) => {
      const index = prev.findIndex((t) => t.action === updated.action);
      if (index === -1) return [...prev, updated];
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const handleSaveTemplate = async (data: {
    subject: string;
    header: string;
    body_message: string;
    banner: string;
    is_enabled: boolean;
  }) => {
    if (!selected) return;
    if (isSuperadmin && !scopeUuid.trim()) {
      addToast({ type: 'error', title: 'Select a project', description: 'Whitelabel UUID is required.' });
      return;
    }
    setIsSaving(true);
    try {
      const saved = await emailTemplatesApi.update(selected.action, {
        ...data,
        ...(isSuperadmin ? { whitelabel_admin_uuid: scopeUuid.trim() } : {}),
      });
      upsertTemplate(saved);
      setIsDrawerOpen(false);
      setSelected(null);
      addToast({
        type: 'success',
        title: 'Template saved',
        description: displayEmailTemplateLabel(saved),
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to save template';
      addToast({ type: 'error', title: 'Save failed', description: message });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (template: EmailTemplate, enabled: boolean) => {
    if (isSuperadmin && !scopeUuid.trim()) {
      throw new Error('Whitelabel UUID is required for superadmin.');
    }
    const saved = await emailTemplatesApi.update(template.action, {
      is_enabled: enabled,
      ...(isSuperadmin ? { whitelabel_admin_uuid: scopeUuid.trim() } : {}),
    });
    upsertTemplate(saved);
  };

  const openEdit = (template: EmailTemplate) => {
    setSelected(template);
    setIsDrawerOpen(true);
  };

  if (isAuthLoading) return <LoadingState />;
  if (!canEdit) return null;

  if (isSuperadmin && !scopeUuid.trim()) {
    return (
      <div className="space-y-6 pb-12">
        <header>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Email templates</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customize transactional emails sent automatically on player events.
          </p>
        </header>
        <ProjectScopePicker value={scopeUuid} onChange={setScopeUuid} required />
      </div>
    );
  }

  if (isLoading) return <LoadingState />;
  if (error && templates.length === 0) {
    return <ErrorState message={error} onRetry={loadTemplates} />;
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Email templates</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customize transactional emails sent automatically on player events. No send action is
            required — the backend delivers them when each event occurs.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void loadTemplates()}>
          Refresh
        </Button>
      </header>

      {isSuperadmin ? (
        <ProjectScopePicker value={scopeUuid} onChange={setScopeUuid} required />
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Event templates</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {templates.length} templates · {templates.filter((t) => t.is_enabled).length} enabled
          </p>
        </div>

        <div className="px-5 py-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Template
                </th>
                <th className="hidden px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 md:table-cell">
                  Subject
                </th>
                <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Enabled
                </th>
                <th className="py-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <TemplateRow
                  key={template.action}
                  template={template}
                  isSaving={isSaving}
                  onEdit={openEdit}
                  onToggleEnabled={handleToggleEnabled}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EmailTemplateEditorDrawer
        template={selected}
        isOpen={isDrawerOpen}
        isSaving={isSaving}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelected(null);
        }}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
