'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Drawer } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { playersApi } from '@/lib/api';
import {
  EMAIL_BROADCAST_AUDIENCES,
  getEmailBroadcastPlaceholders,
} from '@/lib/constants/email-broadcasts';
import {
  emailPlaceholderToken,
  renderEmailPreview,
} from '@/lib/constants/email-templates';
import { ProjectScopePicker } from '@/components/features/project-scope-picker';
import { getStoredProjectUuid } from '@/lib/utils/project-uuid';
import type { CreateEmailBroadcastRequest, EmailBroadcastAudience, Player } from '@/types';

interface EmailBroadcastComposeDrawerProps {
  isOpen: boolean;
  isSaving: boolean;
  isSuperadmin: boolean;
  defaultScopeUuid?: string;
  onClose: () => void;
  onSubmit: (data: CreateEmailBroadcastRequest) => Promise<void>;
}

export function EmailBroadcastComposeDrawer({
  isOpen,
  isSaving,
  isSuperadmin,
  defaultScopeUuid = '',
  onClose,
  onSubmit,
}: EmailBroadcastComposeDrawerProps) {
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('<p>Hi {{ username }},</p>');
  const [audience, setAudience] = useState<EmailBroadcastAudience>('whitelabel');
  const [scopeUuid, setScopeUuid] = useState(defaultScopeUuid);
  const [scheduledAt, setScheduledAt] = useState('');
  const [userIdsText, setUserIdsText] = useState('');
  const [playerQuery, setPlayerQuery] = useState('');
  const [playerHits, setPlayerHits] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const placeholders = useMemo(() => getEmailBroadcastPlaceholders(), []);

  useEffect(() => {
    if (isOpen) {
      setSubject('');
      setHtmlBody('<p>Hi {{ username }},</p>');
      setAudience(isSuperadmin ? 'whitelabel' : 'all');
      setScopeUuid(defaultScopeUuid);
      setScheduledAt('');
      setUserIdsText('');
      setPlayerQuery('');
      setPlayerHits([]);
      setSelectedPlayers([]);
      setTab('edit');
      setError(null);
    }
  }, [isOpen, defaultScopeUuid, isSuperadmin]);

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

    if (audience === 'whitelabel' && !resolvedUuid) {
      setError('Whitelabel admin UUID is required for whitelabel audience.');
      return;
    }

    const userIds = parseUserIds();
    if (audience === 'selected' && userIds.length === 0) {
      setError('Select at least one player or enter user IDs.');
      return;
    }

    const payload: CreateEmailBroadcastRequest = {
      subject: subject.trim(),
      html_body: htmlBody,
      audience,
    };

    if (audience === 'whitelabel' && resolvedUuid) {
      payload.whitelabel_admin_uuid = resolvedUuid;
    } else if (isSuperadmin && resolvedUuid) {
      payload.whitelabel_admin_uuid = resolvedUuid;
    }
    if (audience === 'selected') {
      payload.user_ids = userIds;
    }
    if (scheduledAt.trim()) {
      payload.scheduled_at = new Date(scheduledAt).toISOString();
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create broadcast');
    }
  };

  const previewHtml = renderEmailPreview(htmlBody, placeholders);
  const scheduleLabel = scheduledAt.trim() ? 'Schedule email' : 'Send now';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Compose email campaign"
      subtitle="Broadcast to opted-in players"
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isSaving}
            disabled={isSaving}
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
            disabled={isSaving}
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
            disabled={isSaving}
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {EMAIL_BROADCAST_AUDIENCES.find((item) => item.value === audience)?.description}
          </p>
        </div>

        {isSuperadmin && (audience === 'whitelabel' || audience === 'all') ? (
          <ProjectScopePicker
            value={scopeUuid}
            onChange={setScopeUuid}
            disabled={isSaving}
            required={audience === 'whitelabel'}
            label="Project (whitelabel)"
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
                disabled={isSaving}
              />
              {playerHits.length > 0 ? (
                <ul className="mt-2 max-h-40 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
                  {playerHits.map((player) => {
                    const already = selectedPlayers.some((row) => row.id === player.id);
                    return (
                      <li key={player.id}>
                        <button
                          type="button"
                          disabled={already || isSaving}
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
                disabled={isSaving}
              />
            </div>
          </div>
        ) : null}

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
            disabled={isSaving}
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
              disabled={isSaving}
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
                disabled={isSaving}
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
