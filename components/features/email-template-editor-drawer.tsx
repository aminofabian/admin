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
    header: string;
    body_message: string;
    banner: string;
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
  const [header, setHeader] = useState('');
  const [bodyMessage, setBodyMessage] = useState('');
  const [banner, setBanner] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const variables = template
    ? resolveEmailTemplateVariables(template.required_placeholders || [])
    : [];

  const defaults = template?.defaults;
  const isDefault = defaults
    ? subject === defaults.subject &&
      header === defaults.header &&
      bodyMessage === defaults.body_message &&
      banner === (defaults.banner || '')
    : false;

  useEffect(() => {
    if (template) {
      setSubject(template.subject || '');
      setHeader(template.header || '');
      setBodyMessage(template.body_message || '');
      setBanner(template.banner || '');
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
        header,
        body_message: bodyMessage,
        banner,
        is_enabled: isEnabled,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleRestoreDefault = () => {
    if (!defaults) return;
    setSubject(defaults.subject || '');
    setHeader(defaults.header || '');
    setBodyMessage(defaults.body_message || '');
    setBanner(defaults.banner || '');
  };

  const previewHtml = renderEmailPreview(
    [
      banner ? `<p><img src="${banner}" alt="Banner" style="max-width:100%;height:auto;" /></p>` : '',
      header ? `<h1>${header}</h1>` : '',
      bodyMessage,
    ].join('\n'),
    variables,
  );

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
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Enabled</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Off uses the system fallback HTML instead of this custom template.
            </p>
          </div>
          <Switch checked={isEnabled} onChange={setIsEnabled} disabled={isSaving} tone="emerald" />
        </div>

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
            placeholder="Purchase confirmed — {{ amount }}"
            disabled={isSaving}
          />
        </div>

        <div>
          <label
            htmlFor="email-template-header"
            className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Header
          </label>
          <Input
            id="email-template-header"
            type="text"
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            placeholder="Thanks {{ username }}"
            disabled={isSaving}
          />
        </div>

        <div>
          <label
            htmlFor="email-template-banner"
            className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Banner URL
          </label>
          <Input
            id="email-template-banner"
            type="url"
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
            placeholder="https://cdn.example.com/banner.png"
            disabled={isSaving}
          />
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
              value={bodyMessage}
              onChange={(e) => setBodyMessage(e.target.value)}
              onSelect={rememberSelection}
              onClick={rememberSelection}
              onKeyUp={rememberSelection}
              disabled={isSaving}
              spellCheck={false}
              rows={14}
              className="w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-xs leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-gray-300 bg-white dark:border-gray-600">
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="h-[420px] w-full"
              />
            </div>
          )}
        </div>

        {variables.length > 0 ? (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Required placeholders — click to insert
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
