'use client';

import { useEffect, useState } from 'react';
import { useReferralPlayerOverrideStore } from '@/stores';
import { Button, Input, useToast } from '@/components/ui';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';
import {
  EMPTY_REFERRAL_OVERRIDE_FORM,
  buildReferralPlayerOverridePatch,
  referralOverrideFormFromRecord,
  type ReferralOverrideFormState,
} from '@/lib/referral-player-override-patch';
import type { BonusType } from '@/types/bonus';

export interface PlayerReferralOverrideSectionProps {
  playerId: number;
  playerUsername?: string;
  canEdit: boolean;
}

const DECIMAL_INPUT = /^\d*\.?\d*$/;

const BONUS_TYPE_OPTIONS: { value: BonusType; label: string }[] = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed amount' },
];

function acceptDecimal(value: string): boolean {
  return value === '' || DECIMAL_INPUT.test(value);
}

function BonusTypeControl({
  value,
  disabled,
  onChange,
}: {
  value: BonusType;
  disabled?: boolean;
  onChange: (next: BonusType) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">Bonus type</p>
      <div
        role="radiogroup"
        aria-label="Referrer bonus type"
        className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-600"
      >
        {BONUS_TYPE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                selected
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
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

  const [formData, setFormData] = useState<ReferralOverrideFormState>(EMPTY_REFERRAL_OVERRIDE_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void fetchForPlayer(playerId);
  }, [fetchForPlayer, playerId]);

  useEffect(() => {
    if (override) {
      setFormData(referralOverrideFormFromRecord(override));
      return;
    }
    if (!isLoading) {
      setFormData(EMPTY_REFERRAL_OVERRIDE_FORM);
    }
  }, [override, isLoading]);

  const updateForm = (patch: Partial<ReferralOverrideFormState>) => {
    setFormError(null);
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    const result = buildReferralPlayerOverridePatch(playerId, formData);
    if (!result.ok) {
      setFormError(result.title);
      return;
    }
    setFormError(null);
    try {
      await saveForPlayer(result.body);
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

  const referrerFieldId = `referrer-bonus-${playerId}`;
  const referredFieldId = `referred-player-bonus-${playerId}`;
  const isFixed = formData.referrer_bonus_type === 'fixed';

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

          <BonusTypeControl
            value={formData.referrer_bonus_type}
            disabled={isSaving}
            onChange={(referrerBonusType) => updateForm({ referrer_bonus_type: referrerBonusType })}
          />

          {isFixed ? (
            <div>
              <label
                htmlFor={referrerFieldId}
                className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Referrer bonus ($)
              </label>
              <Input
                id={referrerFieldId}
                type="text"
                inputMode="decimal"
                value={formData.referrer_bonus_fixed_amount}
                onChange={(e) => {
                  if (acceptDecimal(e.target.value)) {
                    updateForm({ referrer_bonus_fixed_amount: e.target.value });
                  }
                }}
                placeholder="e.g. 10"
                disabled={isSaving}
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor={referrerFieldId}
                className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Referrer bonus percentage (%)
              </label>
              <Input
                id={referrerFieldId}
                type="text"
                inputMode="decimal"
                value={formData.referrer_bonus_percentage}
                onChange={(e) => {
                  if (acceptDecimal(e.target.value)) {
                    updateForm({ referrer_bonus_percentage: e.target.value });
                  }
                }}
                placeholder="e.g. 5"
                disabled={isSaving}
              />
            </div>
          )}

          <div>
            <label
              htmlFor={referredFieldId}
              className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Referred player bonus ($)
            </label>
            <Input
              id={referredFieldId}
              type="text"
              inputMode="decimal"
              value={formData.referred_player_bonus_amount}
              onChange={(e) => {
                if (acceptDecimal(e.target.value)) {
                  updateForm({ referred_player_bonus_amount: e.target.value });
                }
              }}
              placeholder="e.g. 2"
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
              <p>
                Referrer bonus:{' '}
                {override.referrer_bonus_type === 'fixed'
                  ? `$${override.referrer_bonus_fixed_amount}`
                  : `${override.referrer_bonus_percentage}%`}
              </p>
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
