'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRoulettePlayerSpinAllowanceStore } from '@/stores';
import { Button, Input, Switch, useToast } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';
import type { PlayerRouletteSpinAllowance } from '@/lib/api/roulette-player-spin-allowances';

export interface PlayerRouletteSpinAllowanceSectionProps {
  playerId: number;
  playerUsername?: string;
  canEdit: boolean;
}

function describeSource(
  allowance: PlayerRouletteSpinAllowance | null,
): { label: string; tone: 'override' | 'inherited' | 'unset' } {
  const source = allowance?.usage?.allowance_source;
  if (source === 'player') return { label: 'Player override', tone: 'override' };
  if (source === 'company') return { label: 'Inherited from company default', tone: 'inherited' };
  if (!allowance) return { label: 'No override set', tone: 'unset' };
  return { label: 'Player override', tone: 'override' };
}

export function PlayerRouletteSpinAllowanceSection({
  playerId,
  playerUsername,
  canEdit,
}: PlayerRouletteSpinAllowanceSectionProps) {
  const { addToast } = useToast();
  const { byPlayerId, fetchForPlayer, saveForPlayer } =
    useRoulettePlayerSpinAllowanceStore();

  const entry = byPlayerId[playerId];
  const allowance = entry?.allowance ?? null;
  const isLoading = entry?.isLoading ?? false;
  const isSaving = entry?.isSaving ?? false;
  const error = entry?.error ?? null;

  const [spinsPerDay, setSpinsPerDay] = useState<string>('0');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void fetchForPlayer(playerId);
  }, [fetchForPlayer, playerId]);

  useEffect(() => {
    if (allowance) {
      setSpinsPerDay(String(allowance.spins_per_day ?? 0));
      setIsEnabled(Boolean(allowance.is_enabled));
    } else if (entry && !isLoading) {
      // No override exists — start from a sensible empty form.
      setSpinsPerDay('0');
      setIsEnabled(false);
    }
  }, [allowance, entry, isLoading]);

  const usage = allowance?.usage;
  const sourceInfo = useMemo(() => describeSource(allowance), [allowance]);

  const usedSpins = usage?.used_spins ?? 0;
  const totalSpins = usage?.spins_per_day ?? allowance?.spins_per_day ?? 0;
  const remainingSpins = usage?.remaining_spins;
  const isUnlimited = Boolean(usage?.is_unlimited);
  const usagePercent =
    totalSpins > 0 ? Math.min(100, Math.round((usedSpins / totalSpins) * 100)) : 0;

  const validate = (): boolean => {
    const value = parseInt(spinsPerDay, 10);
    if (Number.isNaN(value) || value < 0) {
      setFormError('Spins per day must be a whole number of 0 or greater');
      return false;
    }
    if (isEnabled && value < 1) {
      setFormError('When enabled, spins per day must be at least 1');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await saveForPlayer({
        player_id: playerId,
        spins_per_day: parseInt(spinsPerDay, 10),
        is_enabled: isEnabled,
      });
      addToast({
        type: 'success',
        title: 'Saved',
        description: `Daily spin override for ${playerUsername ?? `player #${playerId}`} updated.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save spin allowance';
      addToast({
        type: 'error',
        title: 'Save failed',
        description: message,
      });
    }
  };

  const hasUsageData = Boolean(usage);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-3">
      <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2 sm:gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 sm:h-7 sm:w-7">
          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h2 className="flex-1 text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm">
          Prize Wheel Spins
        </h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${
            sourceInfo.tone === 'override'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
              : sourceInfo.tone === 'inherited'
                ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
          }`}
        >
          {sourceInfo.label}
        </span>
      </div>

      {isLoading && !entry?.allowance ? (
        <div className="rounded-md border border-gray-100 bg-gray-50/50 px-3 py-4 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-400">
          Loading spin allowance…
        </div>
      ) : (
        <div className="space-y-3">
          {/* Today's usage */}
          {hasUsageData ? (
            <div className="rounded-md border border-gray-100 bg-gray-50/50 p-2.5 dark:border-gray-800 dark:bg-gray-800/30">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Today
                  {usage?.date ? ` · ${usage.date}` : ''}
                </p>
                {isUnlimited ? (
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Unlimited
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {usedSpins} / {totalSpins} used
                  </span>
                )}
              </div>
              {!isUnlimited && totalSpins > 0 ? (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              ) : null}
              {!isUnlimited && remainingSpins != null ? (
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  {remainingSpins} remaining today
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Editor */}
          {canEdit ? (
            <div className="space-y-3 rounded-md border border-gray-100 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900">
              {formError ? (
                <div className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {formError}
                </div>
              ) : null}
              {error ? (
                <div className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100">
                    Enable per-player override
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    Overrides the company default for this player.
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onChange={setIsEnabled}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  Free spins per day
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={spinsPerDay}
                  onChange={(e) => setSpinsPerDay(e.target.value)}
                  placeholder="e.g. 7"
                  disabled={isSaving || !isEnabled}
                />
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  Resets daily. Set to 0 with override enabled to block this player.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  isLoading={isSaving}
                  onClick={() => void handleSave()}
                >
                  Save override
                </Button>
              </div>
            </div>
          ) : null}

          {/* Footer metadata */}
          {allowance?.updated_at ? (
            <div className="rounded-md border border-gray-100 bg-gray-50/50 px-2.5 py-1.5 text-[10px] text-gray-500 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-400">
              {allowance.set_by_username ? (
                <p>
                  Last updated by{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {allowance.set_by_username}
                  </span>
                </p>
              ) : null}
              <p>Updated {formatDate(allowance.updated_at)}</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
