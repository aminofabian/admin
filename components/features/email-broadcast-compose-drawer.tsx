'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Drawer } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { US_STATES } from '@/components/dashboard/players/players-filters';
import { playersApi, emailCampaignTemplatesApi } from '@/lib/api';
import {
  EMAIL_BROADCAST_AUDIENCES,
  EMAIL_BROADCAST_SSN_OPTIONS,
  getEmailBroadcastPlaceholders,
} from '@/lib/constants/email-broadcasts';
import {
  emailPlaceholderToken,
  renderEmailPreview,
} from '@/lib/constants/email-templates';
import { ProjectScopePicker } from '@/components/features/project-scope-picker';
import { getStoredProjectUuid } from '@/lib/utils/project-uuid';
import type {
  CreateEmailBroadcastRequest,
  EmailBroadcastAudience,
  EmailCampaignTemplate,
  Player,
} from '@/types';

type SsnFilterValue = 'any' | 'verified' | 'unverified';

interface EmailBroadcastComposeDrawerProps {
  isOpen: boolean;
  isSaving: boolean;
  isSuperadmin: boolean;
  defaultScopeUuid?: string;
  templates?: EmailCampaignTemplate[];
  initialTemplate?: EmailCampaignTemplate | null;
  onClose: () => void;
  onSubmit: (data: CreateEmailBroadcastRequest) => Promise<void>;
  onTemplatesChange?: () => void;
}

function parseOptionalAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return amount;
}

export function EmailBroadcastComposeDrawer({
  isOpen,
  isSaving,
  isSuperadmin,
  defaultScopeUuid = '',
  templates = [],
  initialTemplate = null,
  onClose,
  onSubmit,
  onTemplatesChange,
}: EmailBroadcastComposeDrawerProps) {
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('<p>Hi {{ username }},</p>');
  const [audience, setAudience] = useState<EmailBroadcastAudience>('all');
  const [scopeUuid, setScopeUuid] = useState(defaultScopeUuid);
  const [scheduledAt, setScheduledAt] = useState('');
  const [userIdsText, setUserIdsText] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [playerHits, setPlayerHits] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [depositMin, setDepositMin] = useState('');
  const [depositMax, setDepositMax] = useState('');
  const [ssnFilter, setSsnFilter] = useState<SsnFilterValue>('any');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const placeholders = useMemo(() => getEmailBroadcastPlaceholders(), []);

  const applyTemplate = (template: EmailCampaignTemplate) => {
    setSelectedTemplateId(String(template.id));
    setSubject(template.subject);
    setHtmlBody(template.html_body);
    setTemplateName(template.name);
  };

  useEffect(() => {
    if (!isOpen) return;

    setAudience('all');
    setScopeUuid(defaultScopeUuid);
    setScheduledAt('');
    setUserIdsText('');
    setPlayerQuery('');
    setPlayerHits([]);
    setSelectedPlayers([]);
    setDepositMin('');
    setDepositMax('');
    setSsnFilter('any');
    setSelectedStates([]);
    setTab('edit');
    setError(null);
    setIsSavingTemplate(false);

    if (initialTemplate) {
      applyTemplate(initialTemplate);
    } else {
      setSelectedTemplateId('');
      setSubject('');
      setHtmlBody('<p>Hi {{ username }},</p>');
      setTemplateName('');
    }
  }, [isOpen, defaultScopeUuid, isSuperadmin, initialTemplate]);

  useEffect(() => {
    if (!isOpen || audience !== 'selected') return;
    const query = playerQuery.trim();
    if (query.length < 2) {
      setPlayerHits([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await playersApi.list({ search: query, page_size: 10 });
        setPlayerHits(Array.isArray(response?.results) ? response.results : []);
      } catch {
        setPlayerHits([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [audience, isOpen, playerQuery]);

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
    const next = htmlBody.slice(0, start) + token + htmlBody.slice(end);
    setHtmlBody(next);
    requestAnimationFrame(() => {
      if (bodyRef.current) {
        const cursor = start + token.length;
        bodyRef.current.focus();
        bodyRef.current.setSelectionRange(cursor, cursor);
      }
    });
  };

  const parseUserIds = (): number[] => {
    const fromText = userIdsText
      .split(/[\s,]+/)
      .map((part) => Number(part.trim()))
      .filter((id) => Number.isFinite(id) && id > 0);
    const fromSelected = selectedPlayers.map((player) => player.id);
    return Array.from(new Set([...fromText, ...fromSelected]));
  };

  const toggleState = (code: string) => {
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((row) => row !== code) : [...prev, code],
    );
  };

  const handleTemplateSelect = (value: string) => {
    setSelectedTemplateId(value);
    if (!value) return;
    const template = templates.find((row) => String(row.id) === value);
    if (template) applyTemplate(template);
  };

  const handleSaveTemplate = async () => {
    setError(null);
    const name = templateName.trim();
    if (!name) {
      setError('Template name is required to save.');
      return;
    }
    if (!subject.trim() || !htmlBody.trim()) {
      setError('Subject and HTML body are required to save a template.');
      return;
    }

    const resolvedUuid =
      scopeUuid.trim() || (!isSuperadmin ? getStoredProjectUuid() || '' : '');

    setIsSavingTemplate(true);
    try {
      const payload = {
        name,
        subject: subject.trim(),
        html_body: htmlBody,
        ...(resolvedUuid ? { whitelabel_admin_uuid: resolvedUuid } : {}),
      };

      const existingId = selectedTemplateId ? Number(selectedTemplateId) : NaN;
      const saved =
        Number.isFinite(existingId) && existingId > 0
          ? await emailCampaignTemplatesApi.update(existingId, payload)
          : await emailCampaignTemplatesApi.create(payload);

      setSelectedTemplateId(String(saved.id));
      setTemplateName(saved.name);
      onTemplatesChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!htmlBody.trim()) {
      setError('HTML body is required.');
      return;
    }
    const resolvedUuid =
      scopeUuid.trim() || (!isSuperadmin ? getStoredProjectUuid() || '' : '');

    const userIds = parseUserIds();
    if (audience === 'selected' && userIds.length === 0) {
      setError('Select at least one player or enter user IDs.');
      return;
    }

    const minAmount = parseOptionalAmount(depositMin);
    const maxAmount = parseOptionalAmount(depositMax);
    if (depositMin.trim() && minAmount === undefined) {
      setError('Deposit minimum must be a valid non-negative number.');
      return;
    }
    if (depositMax.trim() && maxAmount === undefined) {
      setError('Deposit maximum must be a valid non-negative number.');
      return;
    }
    if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
      setError('Deposit minimum cannot be greater than maximum.');
      return;
    }

    const payload: CreateEmailBroadcastRequest = {
      subject: subject.trim(),
      html_body: htmlBody,
      audience,
    };

    if (resolvedUuid) {
      payload.whitelabel_admin_uuid = resolvedUuid;
    }
    if (audience === 'selected') {
      payload.user_ids = userIds;
    }
    if (scheduledAt.trim()) {
      payload.scheduled_at = new Date(scheduledAt).toISOString();
    }

    const templateId = selectedTemplateId ? Number(selectedTemplateId) : NaN;
    if (Number.isFinite(templateId) && templateId > 0) {
      payload.template_id = templateId;
    }

    if (minAmount != null) payload.deposit_min = minAmount;
    if (maxAmount != null) payload.deposit_max = maxAmount;
    if (ssnFilter === 'verified') payload.ssn_verified = true;
    if (ssnFilter === 'unverified') payload.ssn_verified = false;
    if (selectedStates.length > 0) {
      // Backend matches player.state case-insensitively; API examples use full names.
      payload.states = selectedStates
        .map((code) => US_STATES.find((row) => row.value === code)?.label || code)
        .sort((a, b) => a.localeCompare(b));
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create broadcast');
    }
  };

  const previewHtml = renderEmailPreview(htmlBody, placeholders);
  const scheduleLabel = scheduledAt.trim() ? 'Schedule email' : 'Send now';
  const busy = isSaving || isSavingTemplate;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Compose email campaign"
      subtitle="Broadcast to opted-in players"
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isSaving}
            disabled={busy}
            onClick={handleSubmit}
          >
            {scheduleLabel}
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

        <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100">
              Saved template
            </label>
            <Select
              value={selectedTemplateId}
              onChange={handleTemplateSelect}
              options={[
                { value: '', label: 'Start from scratch' },
                ...templates.map((template) => ({
                  value: String(template.id),
                  label: template.name,
                })),
              ]}
              disabled={busy}
              placeholder="Load a saved template"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Load a reusable campaign template, or save the current subject and body for later.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="email-broadcast-template-name"
                className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                Template name
              </label>
              <Input
                id="email-broadcast-template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Weekend deposit promo"
                disabled={busy}
                maxLength={120}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isSavingTemplate}
              disabled={busy}
              onClick={() => void handleSaveTemplate()}
            >
              {selectedTemplateId ? 'Update template' : 'Save as template'}
            </Button>
          </div>
        </div>

        <div>
          <label
            htmlFor="email-broadcast-subject"
            className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Subject
          </label>
          <Input
            id="email-broadcast-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Weekend bonus for {{ username }}"
            disabled={busy}
            maxLength={255}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100">
            Audience
          </label>
          <Select
            value={audience}
            onChange={(value) => setAudience(value as EmailBroadcastAudience)}
            options={EMAIL_BROADCAST_AUDIENCES.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            disabled={busy}
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {EMAIL_BROADCAST_AUDIENCES.find((item) => item.value === audience)?.description}
          </p>
        </div>

        {isSuperadmin ? (
          <ProjectScopePicker
            value={scopeUuid}
            onChange={setScopeUuid}
            disabled={busy}
            required={false}
            label="Project scope (optional)"
          />
        ) : null}

        {audience === 'selected' ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="email-broadcast-player-search"
                className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                Find players
              </label>
              <Input
                id="email-broadcast-player-search"
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                placeholder="Search by username or email"
                disabled={busy}
              />
              {playerHits.length > 0 ? (
                <ul className="mt-2 max-h-40 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
                  {playerHits.map((player) => {
                    const already = selectedPlayers.some((row) => row.id === player.id);
                    return (
                      <li key={player.id}>
                        <button
                          type="button"
                          disabled={already || busy}
                          onClick={() =>
                            setSelectedPlayers((prev) =>
                              prev.some((row) => row.id === player.id) ? prev : [...prev, player],
                            )
                          }
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
                        >
                          <span>
                            {player.username}
                            <span className="ml-2 text-xs text-gray-400">#{player.id}</span>
                          </span>
                          <span className="text-xs text-[#6366f1]">{already ? 'Added' : 'Add'}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            {selectedPlayers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() =>
                      setSelectedPlayers((prev) => prev.filter((row) => row.id !== player.id))
                    }
                    className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {player.username} ×
                  </button>
                ))}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="email-broadcast-user-ids"
                className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                Or paste user IDs
              </label>
              <Input
                id="email-broadcast-user-ids"
                value={userIdsText}
                onChange={(e) => setUserIdsText(e.target.value)}
                placeholder="55, 89, 102"
                disabled={busy}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Audience criteria
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Optional filters. With selected players, filters intersect (only matching IDs are
              emailed). Leave blank to skip a filter.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="email-broadcast-deposit-min"
                className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                Deposit min (lifetime ≥)
              </label>
              <Input
                id="email-broadcast-deposit-min"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={depositMin}
                onChange={(e) => setDepositMin(e.target.value)}
                placeholder="e.g. 50"
                disabled={busy}
              />
            </div>
            <div>
              <label
                htmlFor="email-broadcast-deposit-max"
                className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                Deposit max (lifetime ≤)
              </label>
              <Input
                id="email-broadcast-deposit-max"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={depositMax}
                onChange={(e) => setDepositMax(e.target.value)}
                placeholder="e.g. 500"
                disabled={busy}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100">
              SSN verification
            </label>
            <Select
              value={ssnFilter}
              onChange={(value) => setSsnFilter(value as SsnFilterValue)}
              options={EMAIL_BROADCAST_SSN_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
              disabled={busy}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Maps to identity verified (<code className="text-[11px]">is_identity_verified</code>).
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">States</label>
              {selectedStates.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedStates([])}
                  disabled={busy}
                  className="text-xs text-[#6366f1] hover:underline disabled:opacity-50"
                >
                  Clear ({selectedStates.length})
                </button>
              ) : null}
            </div>
            <div className="max-h-40 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
              <ul className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                {US_STATES.map((state) => {
                  const checked = selectedStates.includes(state.value);
                  return (
                    <li key={state.value}>
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy}
                          onChange={() => toggleState(state.value)}
                          className="rounded border-gray-300 text-[#6366f1] focus:ring-[#6366f1]"
                        />
                        <span>
                          {state.label}
                          <span className="ml-1 text-xs text-gray-400">{state.value}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Leave all unchecked for every state. Sent as full names (e.g. California).
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="email-broadcast-schedule"
            className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Schedule (optional)
          </label>
          <Input
            id="email-broadcast-schedule"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={busy}
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Leave empty to send immediately. Future times create a scheduled campaign.
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label
              htmlFor="email-broadcast-body"
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              HTML body
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
              id="email-broadcast-body"
              ref={bodyRef}
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              onSelect={rememberSelection}
              onClick={rememberSelection}
              onKeyUp={rememberSelection}
              disabled={busy}
              spellCheck={false}
              rows={12}
              className="w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-xs leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-gray-300 bg-white dark:border-gray-600">
              <iframe
                title="Broadcast preview"
                srcDoc={previewHtml}
                sandbox=""
                className="h-[360px] w-full"
              />
            </div>
          )}
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            If you omit {'{{ unsubscribe_url }}'}, the backend appends an Unsubscribe footer.
          </p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Placeholders — click to insert
          </p>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((variable) => (
              <button
                key={variable.key}
                type="button"
                onClick={() => insertVariable(variable.key)}
                disabled={busy}
                title={variable.label}
                className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:border-[#6366f1] hover:text-[#6366f1] disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {emailPlaceholderToken(variable.key)}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
