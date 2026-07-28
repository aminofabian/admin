'use client';

import { useEffect, useState } from 'react';
import { useReferralPlayerOverrideStore } from '@/stores';
import { Button, Input, useToast } from '@/components/ui';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';

export interface PlayerReferralOverrideSectionProps {
  playerId: number;
  playerUsername?: string;
  canEdit: boolean;
}

export function PlayerReferralOverrideSection({
  playerId,
  playerUsername,
  canEdit,
}: PlayerReferralOverrideSectionProps) {
  const { addToast } = useToast();
  const { byPlayerId, fetchForPlayer, saveForPlayer } = useReferralPlayerOverrideStore();

  const entry = byPlayerId[playerId];
  const override = entry?.override ?? null;
  const isLoading = entry?.isLoading ?? false;
  const isSaving = entry?.isSaving ?? false;
  const error = entry?.error ?? null;

  const [referrerBonusPercentage, setReferrerBonusPercentage] = useState('0');
  const [referredPlayerBonusAmount, setReferredPlayerBonusAmount] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void fetchForPlayer(playerId);
  }, [fetchForPlayer, playerId]);

  useEffect(() => {
    if (override) {
      setReferrerBonusPercentage(String(override.referrer_bonus_percentage ?? '0'));
      setReferredPlayerBonusAmount(String(override.referred_player_bonus_amount ?? '0'));
    } else if (entry && !isLoading) {
      setReferrerBonusPercentage('0');
      setReferredPlayerBonusAmount('0');
    }
  }, [override, entry, isLoading]);

  const validate = (): boolean => {
    const percentage = Number.parseFloat(referrerBonusPercentage);
    const bonus = Number.parseFloat(referredPlayerBonusAmount);

    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      setFormError('Referrer bonus percentage must be between 0 and 100');
      return false;
    }
    if (Number.isNaN(bonus) || bonus < 0) {
      setFormError('Referred player bonus must be 0 or greater');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await saveForPlayer({
        player: playerId,
        referrer_bonus_percentage: Number.parseFloat(referrerBonusPercentage),
        referred_player_bonus_amount: Number.parseFloat(referredPlayerBonusAmount),
      });
      addToast({
        type: 'success',
        title: 'Saved',
        description: `Referral override for ${playerUsername ?? `player #${playerId}`} updated.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save referral override';
      addToast({ type: 'error', title: 'Save failed', description: message });
    }
  };

  return (
    <PlayerDetailPanel
      title="Referral override"
      actions={
        <span
          className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            override
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {override ? 'Player override' : 'Company default'}
        </span>
      }
    >
      {isLoading && !override ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading referral override…</p>
      ) : canEdit ? (
        <div className="space-y-3">
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

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Overrides company referral rewards for this player only.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Referrer bonus percentage (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={referrerBonusPercentage}
              onChange={(e) => setReferrerBonusPercentage(e.target.value)}
              placeholder="e.g. 10"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Referred player bonus ($)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={referredPlayerBonusAmount}
              onChange={(e) => setReferredPlayerBonusAmount(e.target.value)}
              placeholder="e.g. 5"
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end">
            <Button type="button" size="sm" isLoading={isSaving} onClick={() => void handleSave()}>
              Save override
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {override ? (
            <>
              <p>Referrer bonus: {override.referrer_bonus_percentage}%</p>
              <p>Referred player bonus: ${override.referred_player_bonus_amount}</p>
            </>
          ) : (
            <p>No player override — using company default.</p>
          )}
        </div>
      )}
    </PlayerDetailPanel>
  );
}
