'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { playersApi } from '@/lib/api';
import type { EmailCampaignSelectedPlayer, Player } from '@/types';

const TABLE_THRESHOLD = 6;

interface EmailCampaignSpecificPlayersProps {
  selected: EmailCampaignSelectedPlayer[];
  disabled?: boolean;
  onChange: (players: EmailCampaignSelectedPlayer[]) => void;
}

function toSelected(player: Player): EmailCampaignSelectedPlayer {
  return {
    id: player.id,
    username: player.username,
    email: player.email || '',
  };
}

export function EmailCampaignSpecificPlayers({
  selected,
  disabled = false,
  onChange,
}: EmailCampaignSpecificPlayersProps) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Player[]>([]);
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
        const response = await playersApi.list({ search: trimmed, page_size: 12 });
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
    if (selected.length >= TABLE_THRESHOLD) {
      setShowTable(true);
    }
  }, [selected.length]);

  const addPlayer = (player: Player) => {
    if (selected.some((row) => row.id === player.id)) return;
    onChange([...selected, toSelected(player)]);
    // Keep search open/query so staff can continue selecting.
  };

  const removePlayer = (id: number) => {
    onChange(selected.filter((row) => row.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="email-campaign-player-search"
          className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          Find players
        </label>
        <Input
          id="email-campaign-player-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or email"
          disabled={disabled}
          autoComplete="off"
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Search by username or email only. The menu stays open so you can keep adding players.
        </p>

        {query.trim().length >= 2 ? (
          <ul className="mt-2 max-h-52 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
            {isSearching ? (
              <li className="px-3 py-2 text-sm text-gray-500">Searching…</li>
            ) : hits.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">No players found</li>
            ) : (
              hits.map((player) => {
                const already = selected.some((row) => row.id === player.id);
                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      disabled={already || disabled}
                      onClick={() => addPlayer(player)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
                    >
                      <span className="min-w-0">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {player.username}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {player.email || 'No email'} · #{player.id}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-[#6366f1]">
                        {already ? 'Added' : 'Add'}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Selected: <span className="font-medium">{selected.length}</span>
        </p>
        <div className="flex gap-2">
          {selected.length > 0 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => setShowTable((prev) => !prev)}
              >
                {showTable ? 'Hide table' : 'View Selected Players'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange([])}
              >
                Clear All
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {selected.length > 0 && !showTable ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((player) => (
            <button
              key={player.id}
              type="button"
              disabled={disabled}
              onClick={() => removePlayer(player.id)}
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              title={player.email || undefined}
            >
              {player.username} ×
            </button>
          ))}
        </div>
      ) : null}

      {selected.length > 0 && showTable ? (
        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Username
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Email
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {selected.map((player) => (
                <tr
                  key={player.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-700/80"
                >
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {player.username}
                    <span className="ml-1 text-xs font-normal text-gray-400">#{player.id}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {player.email || '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removePlayer(player.id)}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
