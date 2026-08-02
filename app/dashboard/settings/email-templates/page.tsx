'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES, canManageEmailTemplates } from '@/lib/constants/roles';
import { emailTemplatesApi } from '@/lib/api';
import { mergeEmailTemplates } from '@/lib/constants/email-templates';
import { Button, Switch, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import { EmailTemplateEditorDrawer } from '@/components/features/email-template-editor-drawer';
import { EMAIL_TEMPLATE_CATEGORIES } from '@/types';
import type { EmailTemplate } from '@/types';

function CustomizedBadge({ customized }: { customized: boolean }) {
  if (!customized) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[#6366f1]/10 px-2 py-0.5 text-[11px] font-medium text-[#6366f1] dark:bg-[#6366f1]/20">
      Customized
    </span>
  );
}

function TemplateRow({
  template,
  isSaving,
  onEdit,
  onToggleActive,
}: {
  template: EmailTemplate;
  isSaving: boolean;
  onEdit: (template: EmailTemplate) => void;
  onToggleActive: (template: EmailTemplate, active: boolean) => Promise<void>;
}) {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleToggle = async (active: boolean) => {
    setBusy(true);
    try {
      await onToggleActive(template, active);
      addToast({
        type: 'success',
        title: active ? 'Template enabled' : 'Template disabled',
        description: template.name,
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
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{template.name}</p>
        <p className="mt-0.5 max-w-xl text-xs text-gray-500 dark:text-gray-400">
          {template.description}
        </p>
        <div className="mt-1.5">
          <CustomizedBadge customized={template.is_customized} />
        </div>
      </td>
      <td className="px-3 py-3.5">
        <Switch
          checked={template.is_active}
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

  const canEdit = canManageEmailTemplates(user?.role);

  useEffect(() => {
    if (user?.role === USER_ROLES.STAFF || user?.role === USER_ROLES.AGENT) {
      router.push('/dashboard/settings');
    }
  }, [user?.role, router]);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await emailTemplatesApi.list();
      setTemplates(mergeEmailTemplates(rows));
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
  }, []);

  useEffect(() => {
    if (canEdit) {
      void loadTemplates();
    }
  }, [canEdit, loadTemplates]);

  const upsertTemplate = useCallback((updated: EmailTemplate) => {
    setTemplates((prev) => {
      const index = prev.findIndex((t) => t.template_type === updated.template_type);
      if (index === -1) return [...prev, updated];
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const persistTemplate = useCallback(
    async (
      template: EmailTemplate,
      changes: { subject?: string; body?: string; is_active?: boolean },
    ) => {
      if (template.id !== null) {
        return emailTemplatesApi.update(template.id, changes);
      }
      return emailTemplatesApi.create({
        template_type: template.template_type,
        subject: changes.subject ?? template.subject,
        body: changes.body ?? template.body,
        is_active: changes.is_active ?? template.is_active,
      });
    },
    [],
  );

  const refreshMerged = useCallback(
    (saved: EmailTemplate, source: EmailTemplate) => {
      const rows = [
        saved,
        ...templates.filter((t) => t.id !== null && t.id !== saved.id),
      ];
      const merged = mergeEmailTemplates(rows);
      const updated = merged.find((t) => t.template_type === source.template_type);
      if (updated) upsertTemplate(updated);
    },
    [templates, upsertTemplate],
  );

  const handleSaveTemplate = async (data: { subject: string; body: string }) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      const saved = await persistTemplate(selected, { subject: data.subject, body: data.body });
      refreshMerged(saved, selected);
      setIsDrawerOpen(false);
      setSelected(null);
      addToast({ type: 'success', title: 'Template saved', description: selected.name });
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

  const handleToggleActive = async (template: EmailTemplate, active: boolean) => {
    const saved = await persistTemplate(template, { is_active: active });
    refreshMerged(saved, template);
  };

  const groups = useMemo(() => {
    const event = templates.filter((t) => t.category === EMAIL_TEMPLATE_CATEGORIES.EVENT);
    const campaign = templates.filter((t) => t.category === EMAIL_TEMPLATE_CATEGORIES.CAMPAIGN);
    return [
      { key: EMAIL_TEMPLATE_CATEGORIES.EVENT, title: 'Event-based emails', items: event },
      {
        key: EMAIL_TEMPLATE_CATEGORIES.CAMPAIGN,
        title: 'Campaign / scheduled emails',
        items: campaign,
      },
    ];
  }, [templates]);

  const openEdit = (template: EmailTemplate) => {
    setSelected(template);
    setIsDrawerOpen(true);
  };

  if (isAuthLoading || isLoading) return <LoadingState />;
  if (!canEdit) return null;
  if (error && templates.length === 0) {
    return <ErrorState message={error} onRetry={loadTemplates} />;
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Email templates</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize the emails your players receive. Changes apply to this company only.
        </p>
      </header>

      {groups.map((group) => (
        <section
          key={group.key}
          className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{group.title}</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {group.items.length} {group.items.length === 1 ? 'template' : 'templates'} ·{' '}
              {group.items.filter((t) => t.is_active).length} active
            </p>
          </div>

          <div className="px-5 py-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Template
                  </th>
                  <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Active
                  </th>
                  <th className="py-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((template) => (
                  <TemplateRow
                    key={template.template_type}
                    template={template}
                    isSaving={isSaving}
                    onEdit={openEdit}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

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
