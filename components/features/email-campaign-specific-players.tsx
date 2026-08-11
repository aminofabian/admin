'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { emailBroadcastsApi } from '@/lib/api';
import { ComposerFieldLabel } from '@/components/features/email-campaign-composer-ui';
import type { EmailBroadcastPlayerSearchResult, EmailCampaignSelectedPlayer } from '@/types';

const TABLE_THRESHOLD = 6;

interface EmailCampaignSpecificPlayersProps {
  selected: EmailCampaignSelectedPlayer[];
  disabled?: boolean;
  onChange: (players: EmailCampaignSelectedPlayer[]) => void;
}

function toSelected(player: EmailBroadcastPlayerSearchResult): EmailCampaignSelectedPlayer {
  return {
    id: player.id,
    username: player.username,
    email: player.email || '',
    exclusion_reason: player.exclusion_reason || null,
  };
}

function exclusionReasonLabel(reason: string): string {
  return reason.replace(/_/g, ' ');
}

export function EmailCampaignSpecificPlayers({
  selected,
  disabled = false,
  onChange,
}: EmailCampaignSpecificPlayersProps) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<EmailBroadcastPlayerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await emailBroadcastsApi.searchPlayers(trimmed);
        setHits(Array.isArray(response?.results) ? response.results : []);
      } catch {
        setHits([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (selected.length >= TABLE_THRESHOLD) setShowTable(true);
  }, [selected.length]);

  const addPlayer = (player: EmailBroadcastPlayerSearchResult) => {
    if (selected.some((row) => row.id === player.id)) return;
    onChange([...selected, toSelected(player)]);
  };

  const removePlayer = (id: number) => {
    onChange(selected.filter((row) => row.id !== id));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <ComposerFieldLabel htmlFor="email-campaign-player-search">Find players</ComposerFieldLabel>
        <Input
          id="email-campaign-player-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type at least 2 characters…"
          disabled={disabled}
          autoComplete="off"
        />

        {query.trim().length >= 2 ? (
          <ul className="max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/30">
            {isSearching ? (
              <li className="px-3 py-3 text-sm text-gray-500">Searching…</li>
            ) : hits.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-500">No players found</li>
            ) : (
              hits.map((player) => {
                const already = selected.some((row) => row.id === player.id);
                const ineligible = Boolean(player.exclusion_reason);
                return (
                  <li
                    key={player.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-700/70"
                  >
                    <button
                      type="button"
                      disabled={already || disabled}
                      onClick={() => addPlayer(player)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6366f1]/40 disabled:opacity-50 dark:hover:bg-gray-800/80 dark:focus-visible:bg-gray-800/80"
                    >
                      <span className="min-w-0">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {player.username}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {player.email || 'No email'} · #{player.id}
                        </span>
                        {ineligible ? (
                          <span className="mt-1 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            Ineligible — {exclusionReasonLabel(player.exclusion_reason || 'excluded')}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          already
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            : 'bg-[#6366f1]/10 text-[#4f46e5] dark:text-[#a5b4fc]'
                        }`}
                      >
                        {already ? 'Added' : 'Add'}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Start typing a username or email to search.
          </div>
        )}
        {selected.some((player) => player.exclusion_reason) ? (
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            Ineligible players are marked automatically and cannot be overridden — they are excluded
            from the final recipient list on send.
          </p>
        ) : null}
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            Selected
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-200">
              {selected.length}
            </span>
          </p>
          {selected.length > 0 ? (
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => setShowTable((prev) => !prev)}
              >
                {showTable ? 'Chips' : 'Table'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange([])}
              >
                Clear all
              </Button>
            </div>
          ) : null}
        </div>

        {selected.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-gray-200 px-3 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No players selected yet.
          </div>
        ) : !showTable ? (
          <div className="flex max-h-64 flex-wrap content-start gap-2 overflow-auto rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/30">
            {selected.map((player) => (
              <button
                key={player.id}
                type="button"
                disabled={disabled}
                onClick={() => removePlayer(player.id)}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/40 disabled:opacity-50 ${
                  player.exclusion_reason
                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                }`}
                title={
                  player.exclusion_reason
                    ? `Ineligible — ${exclusionReasonLabel(player.exclusion_reason)}`
                    : player.email || undefined
                }
              >
                <span className="truncate font-medium">{player.username}</span>
                {player.exclusion_reason ? (
                  <span className="truncate text-[10px] opacity-80">
                    (ineligible: {exclusionReasonLabel(player.exclusion_reason)})
                  </span>
                ) : null}
                <span className="text-gray-400">×</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="max-h-64 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Player
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Eligibility
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {' '}
                  </th>
                </tr>
              </thead>
              <tbody>
                {selected.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-700/70"
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                      {player.username}
                      <span className="ml-1 text-xs font-normal text-gray-400">#{player.id}</span>
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                      {player.email || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {player.exclusion_reason ? (
                        <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                          {exclusionReasonLabel(player.exclusion_reason)}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          Eligible
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removePlayer(player.id)}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
