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
import { emailBroadcastsApi } from '@/lib/api';
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
  mapFilterRowsToBroadcastPayload,
  summarizeFilterRows,
  validateFilterRows,
} from '@/lib/utils/email-campaign-filters';
import { findUnsupportedEmailVariables } from '@/lib/utils/email-campaign-variables';
import type {
  CreateEmailBroadcastRequest,
  EmailBroadcastPreviewRequest,
  EmailCampaignComposerDraft,
  EmailCampaignComposerStep,
  EmailCampaignRecipientMethod,
  EmailCampaignRecipientPreview,
} from '@/types';

interface EmailCampaignComposerProps {
  scopeKey: string;
  onSent?: () => void;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message : '';
    const detail = typeof record.detail === 'string' ? record.detail : '';
    if (message) return message;
    if (detail) return detail;
  }
  return err instanceof Error ? err.message : fallback;
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
  saveAsDraft: boolean,
): CreateEmailBroadcastRequest {
  const payload: CreateEmailBroadcastRequest = {
    name: draft.internal_name.trim(),
    subject: draft.subject.trim(),
    html_body: draft.html_body,
    audience: draft.recipient_method,
    save_as_draft: saveAsDraft,
  };

  if (draft.recipient_method === 'specific') {
    payload.user_ids = draft.selected_players.map((player) => player.id);
  }

  if (draft.recipient_method === 'filtered') {
    Object.assign(
      payload,
      mapFilterRowsToBroadcastPayload(draft.filter_rows, draft.match_mode),
    );
  }

  if (draft.template_id && draft.template_id > 0) {
    payload.template_id = draft.template_id;
  }

  return payload;
}

function buildPreviewRequest(
  draft: EmailCampaignComposerDraft,
): EmailBroadcastPreviewRequest | null {
  if (draft.recipient_method === 'specific') {
    if (draft.selected_players.length === 0) return null;
    return {
      audience: 'specific',
      user_ids: draft.selected_players.map((player) => player.id),
    };
  }
  if (draft.recipient_method === 'filtered') {
    if (draft.filter_rows.length === 0) return null;
    const { filters, filter_match } = mapFilterRowsToBroadcastPayload(
      draft.filter_rows,
      draft.match_mode,
    );
    return { audience: 'filtered', filters, filter_match };
  }
  return { audience: 'all_eligible' };
}

const EMPTY_PREVIEW: EmailCampaignRecipientPreview = {
  matched: null,
  excluded: null,
  final: null,
  loading: false,
  error: null,
  unsupported: [],
};

function Icon({ d, className = 'h-4 w-4' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

const METHOD_ICONS: Record<
  EmailCampaignRecipientMethod,
  { d: string; tint: string }
> = {
  specific: {
    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    tint: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  },
  filtered: {
    d: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    tint: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  },
  all_eligible: {
    d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
};

const COMPOSER_STEPS = [
  { n: 1, label: 'Email details', sectionId: 'composer-step-details' },
  { n: 2, label: 'Recipients', sectionId: 'composer-step-recipients' },
  { n: 3, label: 'Content & preview', sectionId: 'composer-step-content' },
] as const;

function exclusionCountsLabel(counts?: Record<string, number>): string {
  if (!counts || Object.keys(counts).length === 0) return '';
  return Object.entries(counts)
    .map(([reason, count]) => `${reason.replace(/_/g, ' ')} ${count.toLocaleString()}`)
    .join(' · ');
}

export function EmailCampaignComposer({ scopeKey, onSent }: EmailCampaignComposerProps) {
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

  const previewRequest = useMemo(
    () => buildPreviewRequest(draft),
    // Preview only depends on targeting; name/subject/html edits must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.recipient_method, draft.filter_rows, draft.match_mode, draft.selected_players],
  );

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
    if (!hydrated) return;

    const request = previewRequest;
    if (!request) {
      setRecipientPreview({
        ...EMPTY_PREVIEW,
        matched: 0,
        excluded: null,
        final: 0,
      });
      return;
    }

    let cancelled = false;
    setRecipientPreview((prev) => ({ ...prev, loading: true, error: null }));

    const timer = window.setTimeout(async () => {
      try {
        const response = await emailBroadcastsApi.preview(request);
        if (cancelled) return;
        setRecipientPreview({
          matched: response.matched_count,
          excluded: response.excluded_count,
          final: response.final_count,
          loading: false,
          error: null,
          unsupported: [],
          exclusion_counts: response.exclusion_counts,
          excluded_sample: response.excluded_sample,
          final_sample: response.final_sample,
        });
      } catch {
        if (cancelled) return;
        setRecipientPreview({
          ...EMPTY_PREVIEW,
          error: 'Could not estimate recipients from the current targeting.',
        });
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated, previewRequest]);

  const updateDraft = (patch: Partial<EmailCampaignComposerDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const previewHtml = renderEmailPreview(draft.html_body, placeholders);
  const recipientLabel =
    EMAIL_CAMPAIGN_RECIPIENT_METHODS.find((item) => item.value === draft.recipient_method)
      ?.label || draft.recipient_method;
  const selectedCount = draft.selected_players.length;

  const resolveFinalCount = (): number | null => {
    if (recipientPreview.final != null) return recipientPreview.final;
    if (draft.recipient_method === 'specific') return selectedCount;
    return null;
  };
  const finalCount = resolveFinalCount();

  const validationErrors = validateDraft(draft);
  const canReview = validationErrors.length === 0 && finalCount != null && finalCount > 0;
  const busy = isSavingDraft || isSending;

  const step1Complete = draft.internal_name.trim().length > 0 && draft.subject.trim().length > 0;
  const step2Complete =
    draft.recipient_method === 'specific'
      ? selectedCount > 0
      : draft.recipient_method === 'filtered'
        ? draft.filter_rows.length > 0 && validateFilterRows(draft.filter_rows).length === 0
        : true;
  const step3Complete =
    draft.html_body.trim().length > 0 &&
    findUnsupportedEmailVariables(draft.html_body).length === 0;

  const activeMethod = EMAIL_CAMPAIGN_RECIPIENT_METHODS.find(
    (item) => item.value === draft.recipient_method,
  );
  const activeMethodHint = [
    activeMethod?.description,
    draft.recipient_method === 'specific'
      ? selectedCount > 0
        ? `${selectedCount} selected`
        : null
      : recipientPreview.loading
        ? 'Counting recipients…'
        : recipientPreview.final != null
          ? `${recipientPreview.final.toLocaleString()} eligible`
          : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveDraft = async () => {
    setErrors([]);
    if (!draft.internal_name.trim()) {
      setErrors(['Internal email name is required to save a draft.']);
      return;
    }

    setIsSavingDraft(true);
    try {
      const payload = buildCreatePayload(draft, true);
      const savedLocally = { ...draft, updated_at: new Date().toISOString() };
      saveComposerDraft(scopeKey, savedLocally);

      let broadcastId: number | null = draft.broadcast_id ?? null;
      let savedOnServer = false;
      try {
        const result = broadcastId
          ? await emailBroadcastsApi.update(broadcastId, payload)
          : await emailBroadcastsApi.create(payload);
        broadcastId = result.broadcast.id;
        savedOnServer = true;
      } catch (err) {
        const message = extractErrorMessage(err, 'Could not save draft on the server.');
        setErrors([message]);
        addToast({
          type: 'error',
          title: 'Draft kept locally',
          description: message,
        });
        return;
      }

      const next = { ...savedLocally, broadcast_id: broadcastId };
      updateDraft({ broadcast_id: broadcastId });
      saveComposerDraft(scopeKey, next);
      addToast({
        type: 'success',
        title: 'Draft saved',
        description: savedOnServer
          ? `${draft.internal_name.trim()} (#${broadcastId})`
          : draft.internal_name.trim(),
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleReview = () => {
    const nextErrors = validateDraft(draft);
    const reviewFinalCount = resolveFinalCount();
    if (nextErrors.length === 0 && reviewFinalCount != null && reviewFinalCount <= 0) {
      nextErrors.push('No eligible recipients match this targeting. Adjust the recipients first.');
    }
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    setSendConfirm('');
    setStep('review');
  };

  const handleSend = async () => {
    if (isSending) return;
    const nextErrors = validateDraft(draft);
    const sendFinalCount = resolveFinalCount();
    if (nextErrors.length === 0 && sendFinalCount != null && sendFinalCount <= 0) {
      nextErrors.push('No eligible recipients match this targeting. Adjust the recipients first.');
    }
    setErrors(nextErrors);
    if (nextErrors.length > 0) {
      setStep('edit');
      return;
    }

    if (draft.recipient_method === 'all_eligible' && sendConfirm.trim() !== 'SEND') {
      setErrors(['Type SEND to confirm sending to all eligible players.']);
      return;
    }

    setIsSending(true);
    setErrors([]);
    try {
      if (draft.broadcast_id) {
        await emailBroadcastsApi.send(draft.broadcast_id);
      } else {
        const payload = buildCreatePayload(draft, false);
        await emailBroadcastsApi.create(payload);
      }
      clearComposerDraft(scopeKey);
      addToast({
        type: 'success',
        title: 'Campaign queued',
        description: draft.internal_name.trim(),
      });
      onSent?.();
      router.push('/dashboard/settings/email-broadcasts');
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to send campaign');
      setErrors([message]);
      addToast({ type: 'error', title: 'Send failed', description: message });
    } finally {
      setIsSending(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 pb-12">
        <div>
          <div className="h-3 w-44 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-6 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-10 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
        <div className="flex h-[300px] animate-pulse items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
          Loading composer…
        </div>
      </div>
    );
  }

  if (step === 'review') {
    const matchedLabel =
      draft.recipient_method === 'specific'
        ? String(selectedCount)
        : recipientPreview.matched != null
          ? recipientPreview.matched.toLocaleString()
          : '—';
    const excludedLabel =
      recipientPreview.excluded == null
        ? 'On send'
        : recipientPreview.excluded.toLocaleString();
    const finalCountLabel =
      recipientPreview.final != null
        ? recipientPreview.final.toLocaleString()
        : draft.recipient_method === 'specific'
          ? String(selectedCount)
          : 'Resolved on send';

    return (
      <div className="mx-auto max-w-5xl space-y-4 pb-24">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              Settings · Email campaigns
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-2xl">
              Review & Send
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Confirm the summary, then queue the campaign. Nothing is sent until you press Send
              Email.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings/email-broadcasts')}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <Icon d="M10 19l-7-7m0 0l7-7m-7 7h18" className="h-3.5 w-3.5" />
            Back to campaigns
          </button>
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
          <ComposerMetric size="lg" label="Matched / selected" value={matchedLabel} />
          <ComposerMetric size="lg" label="Auto-excluded" value={excludedLabel} tone="warning" />
          <ComposerMetric size="lg" label="Final recipients" value={finalCountLabel} tone="success" />
        </div>

        {recipientPreview.exclusion_counts &&
        Object.keys(recipientPreview.exclusion_counts).length > 0 ? (
          <ComposerAlert tone="warning">
            <p className="font-medium">Automatic exclusions applied</p>
            <p className="mt-1 opacity-90">
              {exclusionCountsLabel(recipientPreview.exclusion_counts)}. These players cannot
              receive marketing email and are excluded automatically.
            </p>
          </ComposerAlert>
        ) : null}

        {finalCount != null && finalCount <= 0 ? (
          <ComposerAlert>
            <p className="font-medium">No eligible recipients</p>
            <p className="mt-1 opacity-90">
              Everyone in the current targeting is automatically excluded. Go back and adjust the
              recipients before sending.
            </p>
          </ComposerAlert>
        ) : null}

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

        {draft.recipient_method === 'all_eligible' ? (
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
              {finalCountLabel}
              {draft.recipient_method === 'specific'
                ? ` of ${selectedCount} selected player${selectedCount === 1 ? '' : 's'}`
                : ' eligible players'}
            </strong>
            . Marketing-ineligible players are excluded automatically on send.
          </ComposerAlert>
        )}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-gray-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
          <p className="mr-auto text-xs text-gray-500 dark:text-gray-400">
            {finalCount != null && finalCount > 0 ? (
              <>
                Ready to send to{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {finalCount.toLocaleString()}
                </strong>{' '}
                recipient{finalCount === 1 ? '' : 's'}
              </>
            ) : (
              'No eligible recipients yet'
            )}
          </p>
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
              busy ||
              finalCount == null ||
              finalCount <= 0 ||
              (draft.recipient_method === 'all_eligible' && sendConfirm.trim() !== 'SEND')
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
    <div className="mx-auto max-w-7xl space-y-4 pb-24">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            Settings · Email campaigns
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2.5 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-2xl">
            Compose campaign
            {draft.broadcast_id ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                Draft #{draft.broadcast_id}
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Write the message, choose who gets it, preview on desktop or mobile, then review before
            sending.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/settings/email-broadcasts')}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <Icon d="M10 19l-7-7m0 0l7-7m-7 7h18" className="h-3.5 w-3.5" />
          Back to campaigns
        </button>
      </header>

      {/* Progress stepper */}
      <nav className="flex items-center gap-2 overflow-x-auto rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4 dark:border-gray-700/80 dark:bg-gray-800">
        {COMPOSER_STEPS.map((stepDef, index) => {
          const complete =
            stepDef.n === 1 ? step1Complete : stepDef.n === 2 ? step2Complete : step3Complete;
          const isLast = index === COMPOSER_STEPS.length - 1;
          return (
            <div key={stepDef.n} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => scrollToSection(stepDef.sectionId)}
                className="group flex min-w-0 items-center gap-2 text-left"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                    complete
                      ? 'bg-[#6366f1] text-white'
                      : 'bg-[#6366f1]/10 text-[#4f46e5] dark:bg-[#6366f1]/20 dark:text-[#a5b4fc]'
                  }`}
                >
                  {complete ? (
                    <Icon d="M5 13l4 4L19 7" className="h-3 w-3" />
                  ) : (
                    stepDef.n
                  )}
                </span>
                <span className="truncate text-xs font-medium text-gray-700 transition-colors group-hover:text-[#4f46e5] dark:text-gray-200 dark:group-hover:text-[#a5b4fc]">
                  {stepDef.label}
                </span>
              </button>
              {!isLast ? (
                <span
                  className={`h-px flex-1 transition-colors ${
                    complete ? 'bg-[#6366f1]/40' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </nav>

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
          Complete required fields and recipient rules to enable Review & Send. Review stays locked
          until at least one eligible recipient matches.
        </ComposerAlert>
      ) : null}

      <ComposerSection
        step="1"
        title="Email details"
        description="Internal name for staff, subject line for players"
        completed={step1Complete}
        id="composer-step-details"
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
        completed={step2Complete}
        id="composer-step-recipients"
      >
        <div className="mb-4 inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/60 p-1 dark:border-gray-700 dark:bg-gray-900/30">
          {EMAIL_CAMPAIGN_RECIPIENT_METHODS.map((method) => {
            const active = draft.recipient_method === method.value;
            const icon = METHOD_ICONS[method.value];
            return (
              <button
                key={method.value}
                type="button"
                disabled={busy}
                onClick={() =>
                  updateDraft({ recipient_method: method.value as EmailCampaignRecipientMethod })
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <Icon
                  d={icon.d}
                  className={`h-3.5 w-3.5 ${
                    active ? '' : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
                {method.label}
              </button>
            );
          })}
        </div>

        {activeMethodHint ? (
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{activeMethodHint}</p>
        ) : null}

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

        {draft.recipient_method === 'all_eligible' ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <ComposerMetric
                label="Matched"
                value={
                  recipientPreview.loading
                    ? '…'
                    : recipientPreview.matched == null
                      ? '—'
                      : recipientPreview.matched.toLocaleString()
                }
              />
              <ComposerMetric
                label="Auto-excluded"
                value={
                  recipientPreview.excluded == null
                    ? '—'
                    : recipientPreview.excluded.toLocaleString()
                }
                tone="warning"
              />
              <ComposerMetric
                label="Final recipients"
                value={
                  recipientPreview.loading
                    ? '…'
                    : recipientPreview.final == null
                      ? '—'
                      : recipientPreview.final.toLocaleString()
                }
                tone="success"
              />
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-4 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-100">
              <p className="font-medium">All eligible players in this brand</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">
                Marketing-ineligible addresses are excluded automatically. Review requires typing{' '}
                <strong>SEND</strong> before final submission.
              </p>
              {recipientPreview.final_sample && recipientPreview.final_sample.length > 0 ? (
                <details className="mt-3 rounded-lg border border-sky-200/70 bg-white/60 dark:border-sky-900/40 dark:bg-gray-900/40">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-sky-900 dark:text-sky-200">
                    View sample recipients
                  </summary>
                  <ul className="max-h-40 overflow-auto border-t border-sky-200/70 px-3 py-1 dark:border-sky-900/40">
                    {recipientPreview.final_sample.map((row) => (
                      <li
                        key={row.user_id}
                        className="flex items-center justify-between gap-3 py-1.5 text-xs text-sky-900 dark:text-sky-100"
                      >
                        <span className="font-medium">{row.username}</span>
                        <span className="truncate opacity-70">{row.email}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </div>
        ) : null}
      </ComposerSection>

      <ComposerSection
        step="3"
        title="Content & preview"
        description="Edit HTML on the left, preview how it looks on the right"
        completed={step3Complete}
        id="composer-step-content"
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

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                finalCount != null && finalCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <p className="truncate text-xs text-gray-600 dark:text-gray-300">
              {finalCount != null && finalCount > 0
                ? `${finalCount.toLocaleString()} eligible recipient${finalCount === 1 ? '' : 's'}`
                : 'No eligible recipients yet'}
              {draft.broadcast_id ? ` · draft #${draft.broadcast_id}` : ''}
              {draft.updated_at
                ? ` · saved ${new Date(draft.updated_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}
            </p>
          </div>
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
