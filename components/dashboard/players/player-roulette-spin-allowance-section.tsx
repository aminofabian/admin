'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRoulettePlayerSpinAllowanceStore } from '@/stores';
import { usePlayerRouletteSpinInfo } from '@/hooks/use-player-roulette-spin-info';
import { Button, Input, Switch, useToast } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';
import type { PlayerRouletteSpinAllowance } from '@/lib/api/roulette-player-spin-allowances';
import { PlayerRouletteSpinStatusDisplay } from '@/components/dashboard/players/player-roulette-spin-status-display';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';
import type { PlayerRouletteSpinInfo } from '@/lib/roulette/player-spin-allowance-info';

export interface PlayerRouletteSpinAllowanceSectionProps {
  playerId: number;
  playerUsername?: string;
  canEdit: boolean;
}

function describeSource(
  allowance: PlayerRouletteSpinAllowance | null,
  spinInfo: PlayerRouletteSpinInfo | null,
): { label: string; tone: 'override' | 'inherited' | 'unset' } {
  const source = spinInfo?.allowance_source;
  if (source === 'player') return { label: 'Player override', tone: 'override' };
  if (source === 'company') return { label: 'Inherited from company default', tone: 'inherited' };
  if (!allowance && !spinInfo) return { label: 'No override set', tone: 'unset' };
  return { label: 'Player override', tone: 'override' };
}

export function PlayerRouletteSpinAllowanceSection({
  playerId,
  playerUsername,
  canEdit,
}: PlayerRouletteSpinAllowanceSectionProps) {
  const { addToast } = useToast();
  const { byPlayerId, saveForPlayer } = useRoulettePlayerSpinAllowanceStore();

  const entry = byPlayerId[playerId];
  const allowance = entry?.allowance ?? null;
  const isSaving = entry?.isSaving ?? false;
  const storeError = entry?.error ?? null;

  const { spinInfo, isLoading, error: spinError } = usePlayerRouletteSpinInfo(playerId);
  const error = storeError ?? spinError;

  const [spinsPerDay, setSpinsPerDay] = useState<string>('0');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (allowance) {
      setSpinsPerDay(String(allowance.spins_per_day ?? 0));
      setIsEnabled(Boolean(allowance.is_enabled));
    } else if (entry && !isLoading) {
      setSpinsPerDay('0');
      setIsEnabled(false);
    }
  }, [allowance, entry, isLoading]);

  const sourceInfo = useMemo(
    () => describeSource(allowance, spinInfo),
    [allowance, spinInfo],
  );

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

  return (
    <PlayerDetailPanel
      title="Prize wheel spins"
      actions={
        <span
          className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            sourceInfo.tone === 'override'
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300'
              : sourceInfo.tone === 'inherited'
                ? 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
          }`}
        >
          {sourceInfo.label}
        </span>
      }
    >
      {isLoading && !allowance && !spinInfo ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading spin allowance…</p>
      ) : (
        <div className="space-y-3">
          <PlayerRouletteSpinStatusDisplay
            spinInfo={spinInfo}
            isLoading={isLoading && !spinInfo}
            error={error}
            variant="card"
          />

          {canEdit ? (
            <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
              {formError ? (
                <div className="border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {formError}
                </div>
              ) : null}
              {error ? (
                <div className="border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Enable per-player override
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                    Overrides the company default for this player.
                  </p>
                </div>
                <Switch checked={isEnabled} onChange={setIsEnabled} disabled={isSaving} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
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
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Maximum free spins earned per day for this player (credited after first deposit).
                  Set to 0 with override enabled to block daily spins.
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="button" size="sm" isLoading={isSaving} onClick={() => void handleSave()}>
                  Save override
                </Button>
              </div>
            </div>
          ) : null}

          {allowance?.updated_at ? (
            <div className="border-t border-gray-100 pt-2 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
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
    </PlayerDetailPanel>
  );
}
