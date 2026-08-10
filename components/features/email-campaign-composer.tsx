'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { EmailCampaignSpecificPlayers } from '@/components/features/email-campaign-specific-players';
import { EmailCampaignFilterBuilder } from '@/components/features/email-campaign-filter-builder';
import {
  ComposerAlert,
  ComposerFieldLabel,
  ComposerMetric,
  ComposerSection,
} from '@/components/features/email-campaign-composer-ui';

const EmailCampaignHtmlEditor = dynamic(
  () =>
    import('@/components/features/email-campaign-html-editor').then(
      (mod) => mod.EmailCampaignHtmlEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-md border border-gray-300 text-sm text-gray-500 dark:border-gray-600">
        Loading HTML editor…
      </div>
    ),
  },
);
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
import { findUnsupportedEmailVariables } from '@/lib/utils/email-campaign-variables';
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

  const unsupported = findUnsupportedEmailVariables(draft.html_body);
  if (unsupported.length > 0) {
    errors.push(
      `Unsupported variables: ${unsupported.map((key) => `{{ ${key} }}`).join(', ')}.`,
    );
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
  const [insertVariable, setInsertVariable] = useState<(token: string) => void>(
    () => () => undefined,
  );

  const placeholders = useMemo(() => getEmailBroadcastPlaceholders(), []);
  const resolvedUuid = whitelabelAdminUuid || getStoredProjectUuid() || undefined;

  const handleInsertReady = useCallback((insert: (token: string) => void) => {
    setInsertVariable(() => insert);
  }, []);

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

  const handleSaveDraft = async () => {
    setErrors([]);
    if (!draft.internal_name.trim()) {
      setErrors(['Internal email name is required to save a draft.']);
      return;
    }

    setIsSavingDraft(true);
    try {
      const withStamp = { ...draft, updated_at: new Date().toISOString() };
      saveComposerDraft(scopeKey, withStamp);
      setDraft(withStamp);

      // Also persist subject/body as a reusable campaign template when possible.
      try {
        const templatePayload = {
          name: withStamp.internal_name.trim(),
          subject: withStamp.subject.trim() || withStamp.internal_name.trim(),
          html_body: withStamp.html_body,
          ...(resolvedUuid ? { whitelabel_admin_uuid: resolvedUuid } : {}),
        };
        const existingId = withStamp.template_id && withStamp.template_id > 0 ? withStamp.template_id : null;
        const saved = existingId
          ? await emailCampaignTemplatesApi.update(existingId, templatePayload)
          : await emailCampaignTemplatesApi.create(templatePayload);
        const next = { ...withStamp, template_id: saved.id };
        updateDraft({ template_id: saved.id });
        saveComposerDraft(scopeKey, next);
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
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
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
            ? 'Resolved on send'
            : 'All eligible';

    return (
      <div className="mx-auto max-w-5xl space-y-5 pb-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6366f1]">
              Step 2 of 2
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
              Review & Send
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Confirm the summary, then queue the campaign.
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
          <ComposerAlert>
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </ComposerAlert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <ComposerMetric label="Matched / selected" value={matchedLabel} />
          <ComposerMetric
            label="Auto-excluded"
            value={
              recipientPreview.excluded == null
                ? 'On send'
                : recipientPreview.excluded.toLocaleString()
            }
            tone="warning"
          />
          <ComposerMetric label="Final recipients" value={finalCountLabel} tone="success" />
        </div>

        <ComposerSection title="Campaign summary" description="What will be sent">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 px-3.5 py-3 dark:bg-gray-900/40">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Internal name
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {draft.internal_name}
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50 px-3.5 py-3 dark:bg-gray-900/40">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Subject
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {draft.subject}
              </dd>
            </div>
            <div className="rounded-xl bg-gray-50 px-3.5 py-3 dark:bg-gray-900/40">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Recipient method
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {recipientLabel}
              </dd>
            </div>
            {draft.recipient_method === 'filtered' ? (
              <div className="rounded-xl bg-gray-50 px-3.5 py-3 sm:col-span-2 dark:bg-gray-900/40">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Filters
                </dt>
                <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                  {draft.match_mode === 'any' ? 'Any condition · ' : 'All conditions · '}
                  {summarizeFilterRows(draft.filter_rows)}
                </dd>
              </div>
            ) : null}
          </dl>
        </ComposerSection>

        {draft.recipient_method === 'all' ? (
          <ComposerAlert tone="warning">
            <p className="font-medium">Strong confirmation required</p>
            <p className="mt-1 opacity-90">
              You are about to email all eligible players in this brand. Type{' '}
              <strong>SEND</strong> below to enable the send button.
            </p>
            <Input
              className="mt-3 max-w-xs bg-white dark:bg-gray-900"
              value={sendConfirm}
              onChange={(e) => setSendConfirm(e.target.value)}
              placeholder="Type SEND"
              disabled={busy}
              autoComplete="off"
            />
          </ComposerAlert>
        ) : (
          <ComposerAlert tone="info">
            Confirm sending to{' '}
            <strong>
              {draft.recipient_method === 'specific'
                ? `${selectedCount} selected player${selectedCount === 1 ? '' : 's'}`
                : 'filtered eligible players'}
            </strong>
            . Marketing-ineligible players are excluded automatically on send.
          </ComposerAlert>
        )}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
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
    <div className="mx-auto max-w-7xl space-y-5 pb-28">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6366f1]">
            Step 1 of 2 · Compose
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Email campaign
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Write the message, choose who gets it, preview on desktop or mobile, then review before
            sending.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
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
        <ComposerAlert>
          <ul className="list-disc space-y-1 pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </ComposerAlert>
      ) : null}

      {!canReview ? (
        <ComposerAlert tone="warning">
          Complete required fields and recipient rules to enable Review & Send.
        </ComposerAlert>
      ) : null}

      <ComposerSection
        step="1"
        title="Email details"
        description="Internal name for staff, subject line for players"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <ComposerFieldLabel
              htmlFor="email-campaign-internal-name"
              hint="Only visible to your team"
            >
              Internal email name
            </ComposerFieldLabel>
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
            <ComposerFieldLabel
              htmlFor="email-campaign-subject"
              hint="Shown in the player inbox"
            >
              Subject
            </ComposerFieldLabel>
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
      </ComposerSection>

      <ComposerSection
        step="2"
        title="Recipients"
        description="Pick how this campaign should target players"
      >
        <div className="mb-5 grid gap-2 sm:grid-cols-3">
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
                className={`rounded-xl border px-3.5 py-3 text-left transition-all ${
                  active
                    ? 'border-[#6366f1] bg-[#6366f1]/[0.08] shadow-sm ring-1 ring-[#6366f1]/30 dark:bg-[#6366f1]/15'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900/40'
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${
                    active
                      ? 'text-[#4338ca] dark:text-[#c7d2fe]'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {method.label}
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                  {method.description}
                </span>
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
          <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-4 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-100">
            <p className="font-medium">All eligible players in this brand</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              Marketing-ineligible addresses are excluded automatically. Review requires typing{' '}
              <strong>SEND</strong> before final submission.
            </p>
          </div>
        ) : null}
      </ComposerSection>

      <ComposerSection
        step="3"
        title="Content & preview"
        description="Edit HTML on the left, preview how it looks on the right"
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">HTML content</p>
            <EmailCampaignHtmlEditor
              value={draft.html_body}
              disabled={busy}
              onChange={(html_body) => updateDraft({ html_body })}
              onInsertReady={handleInsertReady}
            />
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Insert variable
              </p>
              <div className="flex flex-wrap gap-1.5">
                {placeholders.map((variable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => insertVariable(emailPlaceholderToken(variable.key))}
                    disabled={busy}
                    title={variable.label}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-mono text-[11px] text-gray-700 shadow-sm transition-colors hover:border-[#6366f1] hover:text-[#4f46e5] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                  >
                    {emailPlaceholderToken(variable.key)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3 xl:sticky xl:top-4 xl:self-start">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Live preview</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
                  {(['desktop', 'mobile'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPreviewMode(mode)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
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
                  Refresh
                </Button>
              </div>
            </div>
            <div
              className={`mx-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all dark:border-gray-700 ${
                previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
              }`}
            >
              <div className="border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-900">
                {previewMode === 'mobile' ? 'Mobile frame · 375px' : 'Desktop frame'}
              </div>
              <iframe
                key={previewKey}
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="h-[min(520px,60vh)] min-h-[320px] w-full bg-white"
              />
            </div>
          </div>
        </div>
      </ComposerSection>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Drafts save locally{draft.updated_at ? ` · last saved ${new Date(draft.updated_at).toLocaleString()}` : ''}.
            Review before anything is queued.
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
      </div>
    </div>
  );
}
