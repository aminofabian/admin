'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouletteRewardConfigsStore } from '@/stores';
import { Button, Input, Select, useToast, Badge } from '@/components/ui';
import type {
  RouletteRewardSlot,
  RouletteRewardType,
  RouletteBalanceType,
} from '@/lib/api/roulette-reward-configs';

interface RewardTypeOption {
  value: RouletteRewardType;
  label: string;
  prizeTypeLabel: string;
  balanceType: RouletteBalanceType;
  defaultPrize: (slot: RouletteRewardSlot) => string;
}

const REWARD_TYPE_OPTIONS: RewardTypeOption[] = [
  {
    value: 'main_balance',
    label: 'Main Balance',
    prizeTypeLabel: 'Main Balance',
    balanceType: 'main',
    defaultPrize: (s) => `$${formatAmountForPrize(s.amount)}`,
  },
  {
    value: 'cashoutable_balance',
    label: 'Cashoutable Balance',
    prizeTypeLabel: 'Cashoutable Balance',
    balanceType: 'cashoutable',
    defaultPrize: (s) => `$${formatAmountForPrize(s.amount)}`,
  },
  {
    value: 'respin',
    label: 'Respin',
    prizeTypeLabel: 'Respin',
    balanceType: null,
    defaultPrize: (s) => `${Math.max(1, s.quantity ?? 1)} Respin`,
  },
  {
    value: 'try_again',
    label: 'Try Again',
    prizeTypeLabel: 'Try Again',
    balanceType: null,
    defaultPrize: () => 'Try Again',
  },
];

function formatAmountForPrize(amount: string): string {
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toString();
}

function normalizeRewardType(value: string): RouletteRewardType {
  if (
    value === 'main_balance' ||
    value === 'cashoutable_balance' ||
    value === 'respin' ||
    value === 'try_again'
  ) {
    return value;
  }
  return 'main_balance';
}

function balanceTypeFor(reward: RouletteRewardType): RouletteBalanceType {
  return REWARD_TYPE_OPTIONS.find((o) => o.value === reward)?.balanceType ?? null;
}

function prizeTypeLabelFor(reward: RouletteRewardType): string {
  return REWARD_TYPE_OPTIONS.find((o) => o.value === reward)?.prizeTypeLabel ?? 'Main Balance';
}

function defaultSlot(position: number): RouletteRewardSlot {
  return {
    position,
    prize_type: 'Main Balance',
    prize: '$0',
    backend_chance: '0%',
    amount: '0.00',
    balance_type: 'main',
    reward_type: 'main_balance',
  };
}

function parseChancePercent(raw: string): number {
  const trimmed = raw.trim().replace('%', '');
  if (trimmed === '') return NaN;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

function formatChanceForApi(raw: string): string {
  const n = parseChancePercent(raw);
  if (Number.isNaN(n)) return raw.trim();
  const formatted = Number.isInteger(n) ? String(n) : Number(n.toFixed(2)).toString();
  return `${formatted}%`;
}

export interface RouletteRewardConfigsEditorProps {
  canEdit: boolean;
}

export function RouletteRewardConfigsEditor({ canEdit }: RouletteRewardConfigsEditorProps) {
  const { addToast } = useToast();
  const { config, isLoading, isSaving, error, loaded, fetchConfig, saveConfig } =
    useRouletteRewardConfigsStore();

  const [rewards, setRewards] = useState<RouletteRewardSlot[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const minRewards = config?.min_rewards ?? 6;
  const maxRewards = config?.max_rewards ?? 15;
  const usingDefault = Boolean(config?.using_default);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (loaded && config) {
      setRewards(config.rewards);
    }
  }, [config, loaded]);

  const totalChance = useMemo(() => {
    return rewards.reduce((sum, slot) => {
      const n = parseChancePercent(slot.backend_chance);
      return sum + (Number.isNaN(n) ? 0 : n);
    }, 0);
  }, [rewards]);

  const totalChanceRounded = Math.round(totalChance * 100) / 100;
  const chanceIs100 = Math.abs(totalChanceRounded - 100) < 0.01;
  const slotCountIsValid = rewards.length >= minRewards && rewards.length <= maxRewards;

  const updateSlot = (index: number, patch: Partial<RouletteRewardSlot>) => {
    setRewards((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  };

  const changeRewardType = (index: number, nextType: string) => {
    const reward = normalizeRewardType(nextType);
    const opt = REWARD_TYPE_OPTIONS.find((o) => o.value === reward);
    setRewards((prev) =>
      prev.map((slot, i) => {
        if (i !== index) return slot;
        const balanceType = balanceTypeFor(reward);
        const isMoneyReward = reward === 'main_balance' || reward === 'cashoutable_balance';
        const nextSlot: RouletteRewardSlot = {
          ...slot,
          reward_type: reward,
          prize_type: prizeTypeLabelFor(reward),
          balance_type: balanceType,
          amount: isMoneyReward ? slot.amount : '0.00',
          quantity: reward === 'respin' ? Math.max(1, slot.quantity ?? 1) : undefined,
        };
        if (opt && (slot.prize === '' || slot.prize === opt.defaultPrize(slot))) {
          nextSlot.prize = opt.defaultPrize(nextSlot);
        }
        return nextSlot;
      }),
    );
  };

  const addRow = () => {
    if (rewards.length >= maxRewards) return;
    setRewards((prev) => [...prev, defaultSlot(prev.length + 1)]);
  };

  const removeRow = (index: number) => {
    if (rewards.length <= minRewards) return;
    setRewards((prev) =>
      prev.filter((_, i) => i !== index).map((slot, i) => ({ ...slot, position: i + 1 })),
    );
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRewards((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((slot, i) => ({ ...slot, position: i + 1 }));
    });
  };

  const resetToServer = () => {
    if (config) setRewards(config.rewards);
    setFormError(null);
  };

  const validate = (): string | null => {
    if (rewards.length < minRewards) return `Wheel must have at least ${minRewards} slots.`;
    if (rewards.length > maxRewards) return `Wheel cannot have more than ${maxRewards} slots.`;
    for (const slot of rewards) {
      if (!slot.prize || !slot.prize.trim()) {
        return `Slot ${slot.position}: Prize label is required.`;
      }
      const chance = parseChancePercent(slot.backend_chance);
      if (Number.isNaN(chance) || chance < 0) {
        return `Slot ${slot.position}: Chance must be a non-negative number.`;
      }
      const isMoney =
        slot.reward_type === 'main_balance' || slot.reward_type === 'cashoutable_balance';
      if (isMoney) {
        const amount = parseFloat(slot.amount);
        if (Number.isNaN(amount) || amount < 0) {
          return `Slot ${slot.position}: Amount must be a non-negative number.`;
        }
      }
      if (slot.reward_type === 'respin' && (slot.quantity ?? 0) < 1) {
        return `Slot ${slot.position}: Respin quantity must be at least 1.`;
      }
    }
    if (!chanceIs100) {
      return `Chances must sum to 100% (current: ${totalChanceRounded}%).`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);

    const payload = rewards.map((slot, i) => {
      const reward = normalizeRewardType(String(slot.reward_type));
      const isMoney = reward === 'main_balance' || reward === 'cashoutable_balance';
      const amount = isMoney
        ? Number(parseFloat(slot.amount).toFixed(2)).toFixed(2)
        : '0.00';
      const base = {
        position: i + 1,
        prize_type: prizeTypeLabelFor(reward),
        prize: slot.prize.trim(),
        backend_chance: formatChanceForApi(slot.backend_chance),
        amount,
        balance_type: balanceTypeFor(reward),
        reward_type: reward,
      };
      return reward === 'respin'
        ? { ...base, quantity: Math.max(1, slot.quantity ?? 1) }
        : base;
    });

    try {
      await saveConfig({ rewards: payload });
      addToast({
        type: 'success',
        title: 'Saved',
        description: `Prize wheel updated with ${payload.length} slots.`,
      });
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Failed to save wheel configuration',
      });
    }
  };

  if (isLoading && !loaded) {
    return (
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-muted-foreground">Loading prize wheel configuration…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-foreground">Wheel Slots</h3>
            <Badge variant={usingDefault ? 'default' : 'success'}>
              {usingDefault ? 'Using platform default' : 'Custom configuration'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the prize for each slot on the wheel. Chances must sum to 100% and slot
            count must be between {minRewards} and {maxRewards}.
            {usingDefault
              ? ' Saving will create a custom configuration for your company.'
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              chanceIs100
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
            }`}
          >
            Total chance: {totalChanceRounded}%
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              slotCountIsValid
                ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
            }`}
          >
            {rewards.length} / {minRewards}–{maxRewards} slots
          </span>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {formError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-sm">
          <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">Reward type</th>
              <th className="px-2 py-1">Prize label</th>
              <th className="px-2 py-1 w-28">Amount</th>
              <th className="px-2 py-1 w-24">Qty</th>
              <th className="px-2 py-1 w-28">Chance %</th>
              <th className="px-2 py-1 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((slot, index) => {
              const isMoney =
                slot.reward_type === 'main_balance' ||
                slot.reward_type === 'cashoutable_balance';
              const isRespin = slot.reward_type === 'respin';
              const canRemove = canEdit && !isSaving && rewards.length > minRewards;

              return (
                <tr
                  key={index}
                  className="rounded-lg bg-gray-50 align-middle dark:bg-gray-800/40"
                >
                  <td className="px-2 py-2 font-semibold text-foreground">{index + 1}</td>
                  <td className="px-2 py-2 min-w-[180px]">
                    <Select
                      value={normalizeRewardType(String(slot.reward_type))}
                      onChange={(v) => changeRewardType(index, v)}
                      options={REWARD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      disabled={!canEdit || isSaving}
                    />
                  </td>
                  <td className="px-2 py-2 min-w-[160px]">
                    <Input
                      value={slot.prize}
                      onChange={(e) => updateSlot(index, { prize: e.target.value })}
                      placeholder="e.g. $11 or 1 Respin"
                      disabled={!canEdit || isSaving}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={isMoney ? slot.amount : '0'}
                      onChange={(e) => updateSlot(index, { amount: e.target.value })}
                      disabled={!canEdit || isSaving || !isMoney}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={isRespin ? String(slot.quantity ?? 1) : ''}
                      onChange={(e) =>
                        updateSlot(index, {
                          quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      disabled={!canEdit || isSaving || !isRespin}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={slot.backend_chance}
                      onChange={(e) => updateSlot(index, { backend_chance: e.target.value })}
                      placeholder="e.g. 12%"
                      disabled={!canEdit || isSaving}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveRow(index, -1)}
                        disabled={!canEdit || isSaving || index === 0}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                        aria-label="Move up"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRow(index, 1)}
                        disabled={!canEdit || isSaving || index === rewards.length - 1}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
                        aria-label="Move down"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        disabled={!canRemove}
                        title={
                          canRemove
                            ? 'Remove slot'
                            : `Minimum ${minRewards} slots required`
                        }
                        className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30"
                        aria-label="Remove slot"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addRow}
            disabled={!canEdit || isSaving || rewards.length >= maxRewards}
          >
            + Add slot
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetToServer}
            disabled={!canEdit || isSaving || !config}
          >
            Reset
          </Button>
        </div>
        {canEdit ? (
          <Button
            type="button"
            onClick={() => void handleSave()}
            isLoading={isSaving}
            disabled={!chanceIs100 || !slotCountIsValid}
          >
            Save wheel
          </Button>
        ) : null}
      </div>
    </section>
  );
}
