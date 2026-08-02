'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Drawer } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { getEmailTemplateMeta, getEmailTemplateVariables, renderEmailPreview } from '@/lib/constants/email-templates';
import type { EmailTemplate } from '@/types';

interface EmailTemplateEditorDrawerProps {
  template: EmailTemplate | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  /** Persist the edited subject/body. */
  onSave: (data: { subject: string; body: string }) => Promise<void>;
}

export function EmailTemplateEditorDrawer({
  template,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: EmailTemplateEditorDrawerProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const meta = template ? getEmailTemplateMeta(template.template_type) : undefined;
  const variables = template ? getEmailTemplateVariables(template.template_type) : [];
  const isDefault = meta
    ? subject === meta.subject && body === meta.body
    : true;

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setTab('edit');
      setError(null);
      selectionRef.current = { start: 0, end: 0 };
    }
  }, [template]);

  if (!template) return null;

  const rememberSelection = () => {
    if (bodyRef.current) {
      selectionRef.current = {
        start: bodyRef.current.selectionStart,
        end: bodyRef.current.selectionEnd,
      };
    }
  };

  const insertVariable = (key: string) => {
    rememberSelection();
    const { start, end } = selectionRef.current;
    const token = `{{${key}}}`;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      if (bodyRef.current) {
        const cursor = start + token.length;
        bodyRef.current.focus();
        bodyRef.current.setSelectionRange(cursor, cursor);
      }
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!body.trim()) {
      setError('Body is required.');
      return;
    }
    try {
      await onSave({ subject, body });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleRestoreDefault = () => {
    if (!meta) return;
    setSubject(meta.subject);
    setBody(meta.body);
  };

  const previewHtml = renderEmailPreview(body, variables);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={template.name}
      subtitle={`${template.category === 'event' ? 'Event-based' : 'Campaign'} email template`}
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRestoreDefault}
            disabled={isSaving || isDefault}
          >
            Restore default
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isSaving}
            disabled={isSaving}
            onClick={handleSubmit}
          >
            Save template
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div>
          <label
            htmlFor="email-template-subject"
            className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Subject
          </label>
          <Input
            id="email-template-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your {{company_name}} verification code"
            disabled={isSaving}
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Placeholders like {'{{first_name}}'} are replaced with player data when the email is sent.
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label
              htmlFor="email-template-body"
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              Body (HTML)
            </label>
            <div className="flex rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
              {(['edit', 'preview'] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    tab === name
                      ? 'bg-[#6366f1] text-white'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {tab === 'edit' ? (
            <textarea
              id="email-template-body"
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onSelect={rememberSelection}
              onClick={rememberSelection}
              onKeyUp={rememberSelection}
              disabled={isSaving}
              spellCheck={false}
              rows={16}
              className="w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-xs leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-gray-300 bg-white dark:border-gray-600">
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="h-[480px] w-full"
              />
            </div>
          )}
        </div>

        {variables.length > 0 ? (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Available placeholders — click to insert
            </p>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable.key)}
                  disabled={isSaving}
                  title={variable.label}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:border-[#6366f1] hover:text-[#6366f1] disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {'{{'}
                  {variable.key}
                  {'}}'}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </Drawer>
  );
}
