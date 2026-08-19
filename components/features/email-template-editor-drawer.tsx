'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Switch } from '@/components/ui';
import { Input } from '@/components/ui/input';
import {
  displayEmailTemplateLabel,
  emailPlaceholderToken,
  renderEmailPreview,
  resolveEmailTemplateVariables,
} from '@/lib/constants/email-templates';
import type { EmailTemplate } from '@/types';

interface EmailTemplateEditorDrawerProps {
  template: EmailTemplate | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: {
    subject: string;
    body_message: string;
    is_enabled: boolean;
  }) => Promise<void>;
}

export function EmailTemplateEditorDrawer({
  template,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: EmailTemplateEditorDrawerProps) {
  const [subject, setSubject] = useState('');
  const [bodyMessage, setBodyMessage] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const variables = template
    ? resolveEmailTemplateVariables(template.required_placeholders || []).filter(
        (variable) => variable.key !== 'banner',
      )
    : [];

  const defaults = template?.defaults;
  const isDefault = defaults
    ? subject === defaults.subject && bodyMessage === defaults.body_message
    : false;

  useEffect(() => {
    if (template) {
      setSubject(template.subject || '');
      setBodyMessage(template.body_message || '');
      setIsEnabled(template.is_enabled !== false);
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
    const token = emailPlaceholderToken(key);
    const next = bodyMessage.slice(0, start) + token + bodyMessage.slice(end);
    setBodyMessage(next);
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
    if (!bodyMessage.trim()) {
      setError('Body is required.');
      return;
    }
    try {
      await onSave({
        subject,
        body_message: bodyMessage,
        is_enabled: isEnabled,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleRestoreDefault = () => {
    if (!defaults) return;
    setSubject(defaults.subject || '');
    setBodyMessage(defaults.body_message || '');
  };

  const previewHtml = renderEmailPreview(bodyMessage, variables);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={displayEmailTemplateLabel(template)}
      subtitle={`Event template · ${template.action}`}
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
            disabled={isSaving || !defaults || isDefault}
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Enabled</p>
            <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              Off falls back to the system HTML template.
            </p>
          </div>
          <Switch checked={isEnabled} onChange={setIsEnabled} disabled={isSaving} tone="emerald" />
        </div>

        <div>
          <label
            htmlFor="email-template-subject"
            className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Subject
          </label>
          <Input
            id="email-template-subject"
            type="text"
            compact
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Purchase confirmed — {{ amount }}"
            disabled={isSaving}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label
              htmlFor="email-template-body"
              className="text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Body (HTML)
            </label>
            <div className="flex rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
              {(['edit', 'preview'] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={`rounded px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors ${
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
              value={bodyMessage}
              onChange={(e) => setBodyMessage(e.target.value)}
              onSelect={rememberSelection}
              onClick={rememberSelection}
              onKeyUp={rememberSelection}
              disabled={isSaving}
              spellCheck={false}
              rows={12}
              className="w-full rounded-md border border-gray-300 bg-white p-2.5 font-mono text-xs leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-gray-300 bg-white dark:border-gray-600">
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="h-[360px] w-full"
              />
            </div>
          )}
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Add image URLs directly in the HTML body when needed.
          </p>
        </div>

        {variables.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Placeholders — click to insert
            </p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable.key)}
                  disabled={isSaving}
                  title={variable.label}
                  className="rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-[11px] text-gray-600 transition-colors hover:border-[#6366f1] hover:text-[#6366f1] disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {emailPlaceholderToken(variable.key)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </Drawer>
  );
}
