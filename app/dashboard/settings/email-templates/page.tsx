'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canManageEmailTemplates } from '@/lib/constants/roles';
import { emailTemplatesApi } from '@/lib/api';
import { displayEmailTemplateLabel } from '@/lib/constants/email-templates';
import { resolveEmailScopeUuid } from '@/lib/utils/project-uuid';
import { Badge, Button, Switch, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/features';
import { EmailTemplateEditorDrawer } from '@/components/features/email-template-editor-drawer';
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
    <tr className="group border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50/80 dark:border-gray-700/60 dark:hover:bg-gray-700/30">
      <td className="py-2.5 pr-3">
        <p className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
          {displayEmailTemplateLabel(template)}
        </p>
        <code className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-px font-mono text-[10px] text-gray-500 dark:bg-gray-700/80 dark:text-gray-400">
          {template.action}
        </code>
      </td>
      <td className="hidden px-3 py-2.5 md:table-cell">
        <p className="max-w-md truncate text-xs text-gray-600 dark:text-gray-300" title={template.subject}>
          {template.subject || '—'}
        </p>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Switch
            checked={template.is_enabled}
            onChange={handleToggle}
            disabled={busy || isSaving}
            tone="emerald"
          />
          <Badge
            variant={template.is_enabled ? 'success' : 'default'}
            className="px-1.5 py-0 text-[10px]"
          >
            {template.is_enabled ? 'On' : 'Off'}
          </Badge>
        </div>
      </td>
      <td className="py-2.5 pl-3 text-right">
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
  const [query, setQuery] = useState('');

  const canEdit = canManageEmailTemplates(user?.role);

  useEffect(() => {
    if (user && !canManageEmailTemplates(user.role)) {
      router.push('/dashboard/settings');
    }
  }, [user, router]);

  const effectiveUuid = resolveEmailScopeUuid({
    role: user?.role,
  });

  const loadTemplates = useCallback(async () => {
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
  }, [effectiveUuid]);

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
    body_message: string;
    is_enabled: boolean;
  }) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      const saved = await emailTemplatesApi.update(selected.action, data);
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
    const saved = await emailTemplatesApi.update(template.action, {
      is_enabled: enabled,
    });
    upsertTemplate(saved);
  };

  const openEdit = (template: EmailTemplate) => {
    setSelected(template);
    setIsDrawerOpen(true);
  };

  const enabledCount = templates.filter((t) => t.is_enabled).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => {
      const label = displayEmailTemplateLabel(template).toLowerCase();
      return (
        label.includes(q) ||
        template.action.toLowerCase().includes(q) ||
        (template.subject || '').toLowerCase().includes(q)
      );
    });
  }, [templates, query]);

  if (isAuthLoading) return <LoadingState />;
  if (!canEdit) return null;
  if (isLoading) return <LoadingState />;
  if (error && templates.length === 0) {
    return <ErrorState message={error} onRetry={loadTemplates} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <header className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-gray-700/80 dark:bg-gray-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
              Email templates
            </h1>
            <Badge variant="info" className="px-2 py-0 text-[10px] font-medium">
              {enabledCount}/{templates.length} enabled
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Transactional emails for player events — delivered automatically when each event occurs.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void loadTemplates()}>
          Refresh
        </Button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700/80">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Event templates</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filtered.length === templates.length
                ? `${templates.length} templates`
                : `${filtered.length} of ${templates.length} templates`}
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Input
              type="search"
              compact
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, action, subject…"
              aria-label="Search email templates"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {query.trim()
              ? 'No templates match your search.'
              : 'No email templates configured yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto px-4">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-3 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Template
                  </th>
                  <th className="hidden px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400 md:table-cell">
                    Subject
                  </th>
                  <th className="w-28 px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="w-20 py-2 pl-3 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((template) => (
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
        )}
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
