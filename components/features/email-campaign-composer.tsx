'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { EmailCampaignSpecificPlayers } from '@/components/features/email-campaign-specific-players';
import { EmailCampaignFilterBuilder } from '@/components/features/email-campaign-filter-builder';
import { emailBroadcastsApi, emailCampaignTemplatesApi, playersApi } from '@/lib/api';
import { getEmailBroadcastPlaceholders } from '@/lib/constants/email-broadcasts';
import {
  EMAIL_CAMPAIGN_RECIPIENT_METHODS,
  createEmptyEmailCampaignDraft,
} from '@/lib/constants/email-campaign-composer';
import {
  emailPlaceholderToken,
  renderEmailPreview,
} from '@/lib/constants/email-templates';
import {
  clearComposerDraft,
  consumeComposerSeed,
  loadComposerDraft,
  saveComposerDraft,
} from '@/lib/utils/email-campaign-draft';
import {
  mapFilterRowsToBroadcastCriteria,
  mapFilterRowsToPlayerListParams,
  summarizeFilterRows,
  validateFilterRows,
} from '@/lib/utils/email-campaign-filters';
import { getStoredProjectUuid } from '@/lib/utils/project-uuid';
import type {
  CreateEmailBroadcastRequest,
  EmailCampaignComposerDraft,
  EmailCampaignComposerStep,
  EmailCampaignRecipientMethod,
  EmailCampaignRecipientPreview,
} from '@/types';

interface EmailCampaignComposerProps {
  scopeKey: string;
  whitelabelAdminUuid?: string;
  onSent?: () => void;
}

function validateDraft(draft: EmailCampaignComposerDraft): string[] {
  const errors: string[] = [];
  if (!draft.internal_name.trim()) errors.push('Internal email name is required.');
  if (!draft.subject.trim()) errors.push('Subject is required.');
  if (!draft.html_body.trim()) errors.push('HTML content is required.');

  if (draft.recipient_method === 'specific' && draft.selected_players.length === 0) {
    errors.push('Select at least one player.');
  }

  if (draft.recipient_method === 'filtered') {
    if (draft.filter_rows.length === 0) {
      errors.push('Add at least one filter for Filtered Players.');
    }
    errors.push(...validateFilterRows(draft.filter_rows));
  }

  return errors;
}

function buildCreatePayload(
  draft: EmailCampaignComposerDraft,
  whitelabelAdminUuid?: string,
): CreateEmailBroadcastRequest {
  const payload: CreateEmailBroadcastRequest = {
    subject: draft.subject.trim(),
    html_body: draft.html_body,
    audience: draft.recipient_method === 'specific' ? 'selected' : 'all',
  };

  if (whitelabelAdminUuid) {
    payload.whitelabel_admin_uuid = whitelabelAdminUuid;
  }

  if (draft.recipient_method === 'specific') {
    payload.user_ids = draft.selected_players.map((player) => player.id);
  }

  if (draft.recipient_method === 'filtered') {
    Object.assign(
      payload,
      mapFilterRowsToBroadcastCriteria(draft.filter_rows, draft.match_mode),
    );
  }

  if (draft.template_id && draft.template_id > 0) {
    payload.template_id = draft.template_id;
  }

  return payload;
}

const EMPTY_PREVIEW: EmailCampaignRecipientPreview = {
  matched: null,
  excluded: null,
  final: null,
  loading: false,
  error: null,
  unsupported: [],
};

export function EmailCampaignComposer({
  scopeKey,
  whitelabelAdminUuid,
  onSent,
}: EmailCampaignComposerProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [draft, setDraft] = useState<EmailCampaignComposerDraft>(createEmptyEmailCampaignDraft);
  const [step, setStep] = useState<EmailCampaignComposerStep>('edit');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendConfirm, setSendConfirm] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [recipientPreview, setRecipientPreview] =
    useState<EmailCampaignRecipientPreview>(EMPTY_PREVIEW);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const placeholders = useMemo(() => getEmailBroadcastPlaceholders(), []);
  const resolvedUuid = whitelabelAdminUuid || getStoredProjectUuid() || undefined;

  useEffect(() => {
    const seed = consumeComposerSeed();
    if (seed) {
      setDraft(seed);
    } else {
      const saved = loadComposerDraft(scopeKey);
      if (saved) setDraft(saved);
    }
    setHydrated(true);
  }, [scopeKey]);

  useEffect(() => {
    if (!hydrated || draft.recipient_method !== 'filtered') {
      setRecipientPreview(EMPTY_PREVIEW);
      return;
    }

    if (draft.filter_rows.length === 0) {
      setRecipientPreview({
        ...EMPTY_PREVIEW,
        matched: 0,
        excluded: null,
        final: 0,
      });
      return;
    }

    const { params, unsupported } = mapFilterRowsToPlayerListParams(draft.filter_rows);
    let cancelled = false;
    setRecipientPreview((prev) => ({ ...prev, loading: true, error: null, unsupported }));

    const timer = window.setTimeout(async () => {
      try {
        const response = await playersApi.list(params);
        if (cancelled) return;
        const matched = typeof response?.count === 'number' ? response.count : null;
        setRecipientPreview({
          matched,
          excluded: null,
          final: matched,
          loading: false,
          error: null,
          unsupported,
        });
      } catch {
        if (cancelled) return;
        setRecipientPreview({
          matched: null,
          excluded: null,
          final: null,
          loading: false,
          error: 'Could not estimate recipients from player filters.',
          unsupported,
        });
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated, draft.recipient_method, draft.filter_rows, draft.match_mode]);

  const updateDraft = (patch: Partial<EmailCampaignComposerDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

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
    const next = draft.html_body.slice(0, start) + token + draft.html_body.slice(end);
    updateDraft({ html_body: next });
    requestAnimationFrame(() => {
      if (bodyRef.current) {
        const cursor = start + token.length;
        bodyRef.current.focus();
        bodyRef.current.setSelectionRange(cursor, cursor);
      }
    });
  };

  const handleSaveDraft = async () => {
    setErrors([]);
    if (!draft.internal_name.trim()) {
      setErrors(['Internal email name is required to save a draft.']);
      return;
    }

    setIsSavingDraft(true);
    try {
      saveComposerDraft(scopeKey, draft);

      // Also persist subject/body as a reusable campaign template when possible.
      try {
        const templatePayload = {
          name: draft.internal_name.trim(),
          subject: draft.subject.trim() || draft.internal_name.trim(),
          html_body: draft.html_body,
          ...(resolvedUuid ? { whitelabel_admin_uuid: resolvedUuid } : {}),
        };
        const existingId = draft.template_id && draft.template_id > 0 ? draft.template_id : null;
        const saved = existingId
          ? await emailCampaignTemplatesApi.update(existingId, templatePayload)
          : await emailCampaignTemplatesApi.create(templatePayload);
        updateDraft({ template_id: saved.id });
        saveComposerDraft(scopeKey, { ...draft, template_id: saved.id });
      } catch {
        // Local draft still saved if template API is unavailable.
      }

      addToast({
        type: 'success',
        title: 'Draft saved',
        description: draft.internal_name.trim(),
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleReview = () => {
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    setSendConfirm('');
    setStep('review');
  };

  const handleSend = async () => {
    if (isSending) return;
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (nextErrors.length > 0) {
      setStep('edit');
      return;
    }

    if (draft.recipient_method === 'all' && sendConfirm.trim() !== 'SEND') {
      setErrors(['Type SEND to confirm sending to all eligible players.']);
      return;
    }

    setIsSending(true);
    setErrors([]);
    try {
      const payload = buildCreatePayload(draft, resolvedUuid);
      const result = await emailBroadcastsApi.create(payload);
      clearComposerDraft(scopeKey);
      addToast({
        type: 'success',
        title: 'Campaign queued',
        description: result.message || result.broadcast.subject,
      });
      onSent?.();
      router.push('/dashboard/settings/email-broadcasts');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'detail' in err
            ? String((err as { detail: unknown }).detail)
            : 'Failed to send campaign';
      setErrors([message]);
      addToast({ type: 'error', title: 'Send failed', description: message });
    } finally {
      setIsSending(false);
    }
  };

  const previewHtml = renderEmailPreview(draft.html_body, placeholders);
  const recipientLabel =
    EMAIL_CAMPAIGN_RECIPIENT_METHODS.find((item) => item.value === draft.recipient_method)
      ?.label || draft.recipient_method;
  const selectedCount = draft.selected_players.length;
  const canReview = validateDraft(draft).length === 0;
  const busy = isSavingDraft || isSending;

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
        Loading composer…
      </div>
    );
  }

  if (step === 'review') {
    const matchedLabel =
      draft.recipient_method === 'specific'
        ? String(selectedCount)
        : draft.recipient_method === 'filtered' && recipientPreview.matched != null
          ? recipientPreview.matched.toLocaleString()
          : '—';
    const finalCountLabel =
      draft.recipient_method === 'specific'
        ? String(selectedCount)
        : draft.recipient_method === 'filtered' && recipientPreview.final != null
          ? recipientPreview.final.toLocaleString()
          : draft.recipient_method === 'filtered'
            ? 'Filtered eligible players (final count resolved on send)'
            : 'All eligible players (final count resolved on send)';

    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Review & Send</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Confirm details before queuing this campaign.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push('/dashboard/settings/email-broadcasts')}
          >
            Back to campaigns
          </Button>
        </header>

        {errors.length > 0 ? (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Summary</h2>
          </div>
          <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Internal email name
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{draft.internal_name}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Subject
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{draft.subject}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Recipient method
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{recipientLabel}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Matched / selected
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{matchedLabel}</dd>
            </div>
            {draft.recipient_method === 'filtered' ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Filters
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {draft.match_mode === 'any' ? 'Any condition · ' : 'All conditions · '}
                  {summarizeFilterRows(draft.filter_rows)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Automatically excluded
              </dt>
              <dd className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {recipientPreview.excluded == null
                  ? 'Applied on send (unsubscribed, invalid, bounced, suppressed)'
                  : recipientPreview.excluded.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Final recipients
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{finalCountLabel}</dd>
            </div>
          </dl>
        </section>

        {draft.recipient_method === 'all' ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Strong confirmation required
            </p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/80">
              You are about to email all eligible players in this brand. Type <strong>SEND</strong>{' '}
              to enable the send button.
            </p>
            <Input
              className="mt-3 max-w-xs"
              value={sendConfirm}
              onChange={(e) => setSendConfirm(e.target.value)}
              placeholder="Type SEND"
              disabled={busy}
              autoComplete="off"
            />
          </section>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Confirm sending to{' '}
            <strong>
              {draft.recipient_method === 'specific'
                ? `${selectedCount} selected player${selectedCount === 1 ? '' : 's'}`
                : 'filtered eligible players'}
            </strong>
            . Ineligible marketing recipients are excluded automatically on send.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => setStep('edit')}
          >
            Back to Edit
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isSending}
            disabled={
              busy || (draft.recipient_method === 'all' && sendConfirm.trim() !== 'SEND')
            }
            onClick={() => void handleSend()}
          >
            Send Email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Compose email campaign
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create an HTML email and send it to specific, filtered, or all eligible players.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push('/dashboard/settings/email-broadcasts')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={isSavingDraft}
            disabled={busy}
            onClick={() => void handleSaveDraft()}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy || !canReview}
            onClick={handleReview}
          >
            Review & Send
          </Button>
        </div>
      </header>

      {errors.length > 0 ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <ul className="list-disc space-y-1 pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!canReview ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Review & Send stays disabled until required fields and recipient rules are valid.
        </p>
      ) : null}

      {/* 1. Email details */}
      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">1. Email details</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Internal name and recipient-facing subject
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label
              htmlFor="email-campaign-internal-name"
              className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              Internal email name
            </label>
            <Input
              id="email-campaign-internal-name"
              value={draft.internal_name}
              onChange={(e) => updateDraft({ internal_name: e.target.value })}
              placeholder="Weekend Recharge Offer"
              disabled={busy}
              maxLength={120}
            />
          </div>
          <div>
            <label
              htmlFor="email-campaign-subject"
              className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              Subject
            </label>
            <Input
              id="email-campaign-subject"
              value={draft.subject}
              onChange={(e) => updateDraft({ subject: e.target.value })}
              placeholder="Your weekend reward is waiting"
              disabled={busy}
              maxLength={255}
            />
          </div>
        </div>
      </section>

      {/* 2. Recipients */}
      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">2. Recipients</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Specific players, filtered players, or all eligible players
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {EMAIL_CAMPAIGN_RECIPIENT_METHODS.map((method) => {
              const active = draft.recipient_method === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    updateDraft({ recipient_method: method.value as EmailCampaignRecipientMethod })
                  }
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#4338ca] dark:text-[#a5b4fc]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="block font-medium">{method.label}</span>
                  <span className="mt-0.5 block text-xs opacity-80">{method.description}</span>
                </button>
              );
            })}
          </div>

          {draft.recipient_method === 'specific' ? (
            <EmailCampaignSpecificPlayers
              selected={draft.selected_players}
              disabled={busy}
              onChange={(selected_players) => updateDraft({ selected_players })}
            />
          ) : null}

          {draft.recipient_method === 'filtered' ? (
            <EmailCampaignFilterBuilder
              matchMode={draft.match_mode}
              rows={draft.filter_rows}
              preview={recipientPreview}
              disabled={busy}
              onMatchModeChange={(match_mode) => updateDraft({ match_mode })}
              onChange={(filter_rows) => updateDraft({ filter_rows })}
            />
          ) : null}

          {draft.recipient_method === 'all' ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              <p>
                Sends to every eligible player in the current brand. Marketing ineligible players
                are excluded automatically on send.
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Review requires typing <strong>SEND</strong> before final submission. Live recipient
                counts arrive when the preview API is available.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* 3 + 4. HTML editor and preview */}
      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            3. HTML content &amp; 4. Preview
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Complete email HTML with variables. Preview uses sample data in a sandboxed iframe.
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="email-campaign-html"
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              HTML content
            </label>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
                {(['desktop', 'mobile'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreviewMode(mode)}
                    className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                      previewMode === mode
                        ? 'bg-[#6366f1] text-white'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewKey((key) => key + 1)}
              >
                Refresh Preview
              </Button>
            </div>
          </div>

          <textarea
            id="email-campaign-html"
            ref={bodyRef}
            value={draft.html_body}
            onChange={(e) => updateDraft({ html_body: e.target.value })}
            onSelect={rememberSelection}
            onClick={rememberSelection}
            onKeyUp={rememberSelection}
            disabled={busy}
            spellCheck={false}
            rows={14}
            className="w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-xs leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Variables — click to insert
            </p>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable.key)}
                  disabled={busy}
                  title={variable.label}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:border-[#6366f1] hover:text-[#6366f1] disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {emailPlaceholderToken(variable.key)}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`mx-auto overflow-hidden rounded-md border border-gray-300 bg-white dark:border-gray-600 ${
              previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
            }`}
          >
            <iframe
              key={previewKey}
              title="Email preview"
              srcDoc={previewHtml}
              sandbox=""
              className="h-[420px] w-full"
            />
          </div>
        </div>
      </section>

      {/* 5. Actions */}
      <section className="sticky bottom-0 z-10 rounded-xl border border-gray-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            5. Actions — save without sending, or review before queueing.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isSavingDraft}
              disabled={busy}
              onClick={() => void handleSaveDraft()}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy || !canReview}
              onClick={handleReview}
            >
              Review & Send
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
