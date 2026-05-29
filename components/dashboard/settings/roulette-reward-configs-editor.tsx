'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouletteRewardConfigsStore } from '@/stores';
import { Button, Input, Select, useToast, Badge, Drawer, Modal } from '@/components/ui';
import type {
  RouletteRewardSlot,
  RouletteRewardType,
  RouletteBalanceType,
} from '@/lib/api/roulette-reward-configs';

interface RewardTypeOption {
  value: RouletteRewardType;
  label: string;
  shortLabel: string;
  prizeTypeLabel: string;
  balanceType: RouletteBalanceType;
  defaultPrize: (slot: RouletteRewardSlot) => string;
  icon: React.ReactNode;
}

const REWARD_TYPE_OPTIONS: RewardTypeOption[] = [
  {
    value: 'main_balance',
    label: 'Main Balance',
    shortLabel: 'Main',
    prizeTypeLabel: 'Main Balance',
    balanceType: 'main',
    defaultPrize: (s) => `$${formatAmountForPrize(s.amount)}`,
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
  },
  {
    value: 'cashoutable_balance',
    label: 'Cashoutable Balance',
    shortLabel: 'Cashout',
    prizeTypeLabel: 'Cashoutable Balance',
    balanceType: 'cashoutable',
    defaultPrize: (s) => `$${formatAmountForPrize(s.amount)}`,
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    value: 'respin',
    label: 'Respin',
    shortLabel: 'Respin',
    prizeTypeLabel: 'Respin',
    balanceType: null,
    defaultPrize: (s) => `${Math.max(1, s.quantity ?? 1)} Respin`,
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    value: 'try_again',
    label: 'Try Again',
    shortLabel: 'Try Again',
    prizeTypeLabel: 'Try Again',
    balanceType: null,
    defaultPrize: () => 'Try Again',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
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

function optionFor(reward: RouletteRewardType): RewardTypeOption | undefined {
  return REWARD_TYPE_OPTIONS.find((o) => o.value === reward);
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

// ---------- Bundle/Package presets ----------

type BundleSlot = Omit<RouletteRewardSlot, 'position'> & { position?: number };

interface BundlePreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
  slots: BundleSlot[];
}

function moneySlot(
  reward_type: 'main_balance' | 'cashoutable_balance',
  amount: string,
  chance: string,
): BundleSlot {
  return {
    prize_type: reward_type === 'main_balance' ? 'Main Balance' : 'Cashoutable Balance',
    prize: `$${formatAmountForPrize(amount)}`,
    backend_chance: chance,
    amount,
    balance_type: reward_type === 'main_balance' ? 'main' : 'cashoutable',
    reward_type,
  };
}

function respinSlot(quantity: number, chance: string): BundleSlot {
  return {
    prize_type: 'Respin',
    prize: `${quantity} Respin`,
    backend_chance: chance,
    amount: '0.00',
    balance_type: null,
    reward_type: 'respin',
    quantity,
  };
}

function tryAgainSlot(chance: string): BundleSlot {
  return {
    prize_type: 'Try Again',
    prize: 'Try Again',
    backend_chance: chance,
    amount: '0.00',
    balance_type: null,
    reward_type: 'try_again',
  };
}

const BUNDLE_PRESETS: BundlePreset[] = [
  {
    id: 'starter',
    name: 'Starter Wheel',
    tagline: 'Lean & balanced — perfect to launch with',
    description: '8 slots tuned for new platforms. Modest rewards, generous respins.',
    badge: 'Recommended',
    slots: [
      moneySlot('main_balance', '5.00', '20%'),
      moneySlot('main_balance', '10.00', '10%'),
      moneySlot('cashoutable_balance', '2.00', '10%'),
      respinSlot(1, '20%'),
      respinSlot(2, '10%'),
      tryAgainSlot('20%'),
      moneySlot('main_balance', '1.00', '5%'),
      tryAgainSlot('5%'),
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced Mix',
    tagline: 'A bit of everything for engaged players',
    description: '10 slots blending money rewards, respins and the occasional try-again.',
    slots: [
      moneySlot('main_balance', '2.00', '15%'),
      moneySlot('main_balance', '5.00', '12%'),
      moneySlot('main_balance', '10.00', '8%'),
      moneySlot('main_balance', '20.00', '5%'),
      moneySlot('cashoutable_balance', '2.00', '10%'),
      moneySlot('cashoutable_balance', '5.00', '5%'),
      respinSlot(1, '20%'),
      respinSlot(2, '10%'),
      tryAgainSlot('10%'),
      tryAgainSlot('5%'),
    ],
  },
  {
    id: 'aggressive',
    name: 'Aggressive Payout',
    tagline: 'High-value rewards with lower hit-rates',
    description: '12 slots geared for retention and excitement with bigger payouts.',
    slots: [
      moneySlot('main_balance', '10.00', '15%'),
      moneySlot('main_balance', '25.00', '8%'),
      moneySlot('main_balance', '50.00', '4%'),
      moneySlot('main_balance', '100.00', '2%'),
      moneySlot('cashoutable_balance', '5.00', '10%'),
      moneySlot('cashoutable_balance', '10.00', '6%'),
      moneySlot('cashoutable_balance', '25.00', '3%'),
      respinSlot(1, '15%'),
      respinSlot(2, '10%'),
      respinSlot(3, '5%'),
      tryAgainSlot('15%'),
      tryAgainSlot('7%'),
    ],
  },
  {
    id: 'promo',
    name: 'Holiday Promo',
    tagline: 'Festive cashoutable boost for promotions',
    description: '10 slots that lean into cashoutable rewards for short-term campaigns.',
    badge: 'Limited',
    slots: [
      moneySlot('cashoutable_balance', '5.00', '15%'),
      moneySlot('cashoutable_balance', '10.00', '10%'),
      moneySlot('cashoutable_balance', '20.00', '5%'),
      moneySlot('cashoutable_balance', '50.00', '2%'),
      moneySlot('main_balance', '5.00', '15%'),
      moneySlot('main_balance', '10.00', '8%'),
      respinSlot(1, '15%'),
      respinSlot(2, '10%'),
      tryAgainSlot('15%'),
      tryAgainSlot('5%'),
    ],
  },
  {
    id: 'respin-heavy',
    name: 'Free Spin Heavy',
    tagline: 'Maximises engagement with respins',
    description: '8 slots focused on respins to drive repeat play sessions.',
    slots: [
      respinSlot(1, '25%'),
      respinSlot(2, '20%'),
      respinSlot(3, '10%'),
      respinSlot(5, '5%'),
      moneySlot('main_balance', '2.00', '15%'),
      moneySlot('main_balance', '5.00', '5%'),
      tryAgainSlot('15%'),
      tryAgainSlot('5%'),
    ],
  },
];

interface CustomBundle {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  slots: BundleSlot[];
}

const CUSTOM_BUNDLES_KEY = 'roulette.custom-bundles.v1';

function readCustomBundles(): CustomBundle[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_BUNDLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomBundle[]) : [];
  } catch {
    return [];
  }
}

function writeCustomBundles(bundles: CustomBundle[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_BUNDLES_KEY, JSON.stringify(bundles));
  } catch {
    // ignore quota errors
  }
}

function sumChance(slots: BundleSlot[]): number {
  return slots.reduce((sum, s) => {
    const n = parseChancePercent(s.backend_chance);
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);
}

// ---------- Component ----------

export interface RouletteRewardConfigsEditorProps {
  canEdit: boolean;
}

export function RouletteRewardConfigsEditor({ canEdit }: RouletteRewardConfigsEditorProps) {
  const { addToast } = useToast();
  const { config, isLoading, isSaving, error, loaded, fetchConfig, saveConfig } =
    useRouletteRewardConfigsStore();

  const [rewards, setRewards] = useState<RouletteRewardSlot[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isBundleDrawerOpen, setIsBundleDrawerOpen] = useState(false);
  const [customBundles, setCustomBundles] = useState<CustomBundle[]>([]);
  const [isSaveBundleOpen, setIsSaveBundleOpen] = useState(false);
  const [saveBundleName, setSaveBundleName] = useState('');
  const [saveBundleDescription, setSaveBundleDescription] = useState('');

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

  useEffect(() => {
    setCustomBundles(readCustomBundles());
  }, []);

  const totalChance = useMemo(() => {
    return rewards.reduce((sum, slot) => {
      const n = parseChancePercent(slot.backend_chance);
      return sum + (Number.isNaN(n) ? 0 : n);
    }, 0);
  }, [rewards]);

  const totalChanceRounded = Math.round(totalChance * 100) / 100;
  const chanceIs100 = Math.abs(totalChanceRounded - 100) < 0.01;
  const slotCountIsValid = rewards.length >= minRewards && rewards.length <= maxRewards;
  const chanceFill = Math.min(100, Math.max(0, totalChanceRounded));

  const updateSlot = (index: number, patch: Partial<RouletteRewardSlot>) => {
    setRewards((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  };

  const changeRewardType = (index: number, nextType: string) => {
    const reward = normalizeRewardType(nextType);
    const opt = optionFor(reward);
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
        title: 'Wheel saved',
        description: `Updated with ${payload.length} slots.`,
      });
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Failed to save wheel configuration',
      });
    }
  };

  const applyBundle = (bundle: BundlePreset | CustomBundle) => {
    const slots = bundle.slots;
    const clamped = slots.slice(0, maxRewards);
    const next = clamped.map((s, i) => ({ ...s, position: i + 1 } as RouletteRewardSlot));
    setRewards(next);
    setFormError(null);
    setIsBundleDrawerOpen(false);
    addToast({
      type: 'success',
      title: 'Bundle applied',
      description: `Wheel replaced with "${bundle.name}". Review and save when ready.`,
    });
  };

  const handleSaveCurrentAsBundle = () => {
    if (!saveBundleName.trim()) {
      addToast({
        type: 'error',
        title: 'Name required',
        description: 'Give your bundle a memorable name.',
      });
      return;
    }
    const newBundle: CustomBundle = {
      id: `custom-${Date.now()}`,
      name: saveBundleName.trim(),
      description: saveBundleDescription.trim() || undefined,
      createdAt: new Date().toISOString(),
      slots: rewards.map((s) => {
        const { id: _id, ...rest } = s as RouletteRewardSlot & { id?: number };
        void _id;
        return rest;
      }),
    };
    const next = [newBundle, ...customBundles];
    setCustomBundles(next);
    writeCustomBundles(next);
    setSaveBundleName('');
    setSaveBundleDescription('');
    setIsSaveBundleOpen(false);
    addToast({
      type: 'success',
      title: 'Bundle saved',
      description: `"${newBundle.name}" added to your bundles.`,
    });
  };

  const handleDeleteCustomBundle = (id: string) => {
    const next = customBundles.filter((b) => b.id !== id);
    setCustomBundles(next);
    writeCustomBundles(next);
  };

  if (isLoading && !loaded) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading prize wheel configuration…
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Header */}
        <header className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Wheel composer</h2>
                <Badge variant={usingDefault ? 'default' : 'info'}>
                  {usingDefault ? 'Platform default' : 'Custom'}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Configure each slot on the wheel. Chances must total 100% and slot count must be{' '}
                {minRewards}–{maxRewards}.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsBundleDrawerOpen(true)}
              disabled={!canEdit}
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 0L4 7m8 4v10" />
              </svg>
              Bundles
            </Button>
          </div>

          {/* Progress bar for total chance */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total chance</span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium tabular-nums ${
                    chanceIs100 ? 'text-foreground' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {totalChanceRounded}%{!chanceIs100 && ' / 100%'}
                </span>
                <span className="hidden text-muted-foreground sm:inline">·</span>
                <span
                  className={`hidden text-xs sm:inline ${
                    slotCountIsValid ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {rewards.length}/{maxRewards} slots
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  chanceIs100
                    ? 'bg-primary'
                    : totalChanceRounded > 100
                      ? 'bg-red-500'
                      : 'bg-amber-500 dark:bg-amber-400'
                }`}
                style={{ width: `${chanceFill}%` }}
              />
            </div>
          </div>
        </header>

        {/* Errors */}
        {(error || formError) && (
          <div className="border-b border-border px-5 py-3 sm:px-6">
            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300 sm:text-sm">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{error}</span>
              </div>
            ) : null}
            {formError ? (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 sm:text-sm">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formError}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Slots - Mobile cards */}
        <div className="px-3 py-3 sm:hidden">
          <div className="space-y-2">
            {rewards.map((slot, index) => (
              <SlotCard
                key={index}
                slot={slot}
                index={index}
                total={rewards.length}
                canEdit={canEdit}
                isSaving={isSaving}
                minRewards={minRewards}
                onChangeType={(v) => changeRewardType(index, v)}
                onUpdate={(patch) => updateSlot(index, patch)}
                onMove={(dir) => moveRow(index, dir)}
                onRemove={() => removeRow(index)}
              />
            ))}
          </div>
        </div>

        {/* Slots - Desktop table */}
        <div className="hidden px-5 py-3 sm:block sm:px-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-y-1 text-sm">
              <thead className="text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-12">#</th>
                  <th className="px-3 py-2 w-44">Reward type</th>
                  <th className="px-3 py-2">Prize label</th>
                  <th className="px-3 py-2 w-28">Amount</th>
                  <th className="px-3 py-2 w-20">Qty</th>
                  <th className="px-3 py-2 w-24">Chance</th>
                  <th className="px-3 py-2 w-28 text-right">Actions</th>
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
                      className="align-middle"
                    >
                      <td className="rounded-l-md border-y border-l border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="border-y border-border bg-muted/30 px-3 py-2">
                        <Select
                          value={normalizeRewardType(String(slot.reward_type))}
                          onChange={(v) => changeRewardType(index, v)}
                          options={REWARD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                          disabled={!canEdit || isSaving}
                        />
                      </td>
                      <td className="border-y border-border bg-muted/30 px-3 py-2">
                        <Input
                          value={slot.prize}
                          onChange={(e) => updateSlot(index, { prize: e.target.value })}
                          placeholder="e.g. $11 or 1 Respin"
                          disabled={!canEdit || isSaving}
                        />
                      </td>
                      <td className="border-y border-border bg-muted/30 px-3 py-2">
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
                      <td className="border-y border-border bg-muted/30 px-3 py-2">
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
                      <td className="border-y border-border bg-muted/30 px-3 py-2">
                        <Input
                          value={slot.backend_chance}
                          onChange={(e) => updateSlot(index, { backend_chance: e.target.value })}
                          placeholder="12%"
                          disabled={!canEdit || isSaving}
                        />
                      </td>
                      <td className="rounded-r-md border-y border-r border-border bg-muted/30 px-3 py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton
                            onClick={() => moveRow(index, -1)}
                            disabled={!canEdit || isSaving || index === 0}
                            label="Move up"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          </IconButton>
                          <IconButton
                            onClick={() => moveRow(index, 1)}
                            disabled={!canEdit || isSaving || index === rewards.length - 1}
                            label="Move down"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </IconButton>
                          <IconButton
                            onClick={() => removeRow(index)}
                            disabled={!canRemove}
                            label={
                              canRemove ? 'Remove slot' : `Minimum ${minRewards} slots required`
                            }
                            danger
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                            </svg>
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty state hint */}
        {rewards.length === 0 && (
          <div className="px-5 py-8 text-center sm:px-6">
            <p className="text-sm text-muted-foreground">No slots yet. Apply a bundle to get started fast, or add slots manually.</p>
          </div>
        )}

        {/* Sticky footer toolbar */}
        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addRow}
              disabled={!canEdit || isSaving || rewards.length >= maxRewards}
            >
              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add slot
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSaveBundleOpen(true)}
              disabled={!canEdit || rewards.length === 0}
            >
              Save as bundle
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
            <div className="flex items-center gap-2">
              {!chanceIs100 && (
                <span className="hidden text-xs text-amber-600 dark:text-amber-400 sm:inline">
                  Chances must total 100%
                </span>
              )}
              <Button
                type="button"
                onClick={() => void handleSave()}
                isLoading={isSaving}
                disabled={!chanceIs100 || !slotCountIsValid}
                size="sm"
              >
                Save wheel
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Bundles drawer */}
      <Drawer
        isOpen={isBundleDrawerOpen}
        onClose={() => setIsBundleDrawerOpen(false)}
        title="Wheel Bundles"
        subtitle="Apply a pre-built package or reuse your saved configurations"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsBundleDrawerOpen(false)}>
              Close
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsBundleDrawerOpen(false);
                setIsSaveBundleOpen(true);
              }}
              disabled={!canEdit || rewards.length === 0}
            >
              Save current as bundle
            </Button>
          </>
        }
      >
        <BundlesContent
          customBundles={customBundles}
          onApply={applyBundle}
          onDeleteCustom={handleDeleteCustomBundle}
        />
      </Drawer>

      {/* Save bundle modal */}
      <Modal
        isOpen={isSaveBundleOpen}
        onClose={() => setIsSaveBundleOpen(false)}
        title="Save current wheel as a bundle"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsSaveBundleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCurrentAsBundle}>Save bundle</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Bundle name"
            value={saveBundleName}
            onChange={(e) => setSaveBundleName(e.target.value)}
            placeholder="e.g. October Promo"
            autoFocus
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={saveBundleDescription}
              onChange={(e) => setSaveBundleDescription(e.target.value)}
              placeholder="When to use this bundle…"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Bundles are saved locally on this device for quick reuse.
          </p>
        </div>
      </Modal>
    </>
  );
}

// ---------- Small subcomponents ----------

interface IconButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}

function IconButton({ onClick, disabled, label, children, danger }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'text-red-500/80 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

interface SlotCardProps {
  slot: RouletteRewardSlot;
  index: number;
  total: number;
  canEdit: boolean;
  isSaving: boolean;
  minRewards: number;
  onChangeType: (v: string) => void;
  onUpdate: (patch: Partial<RouletteRewardSlot>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function SlotCard({
  slot,
  index,
  total,
  canEdit,
  isSaving,
  minRewards,
  onChangeType,
  onUpdate,
  onMove,
  onRemove,
}: SlotCardProps) {
  const reward = normalizeRewardType(String(slot.reward_type));
  const opt = optionFor(reward);
  const isMoney = reward === 'main_balance' || reward === 'cashoutable_balance';
  const isRespin = reward === 'respin';
  const canRemove = canEdit && !isSaving && total > minRewards;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {opt?.icon}
              {opt?.shortLabel ?? 'Reward'}
            </span>
            <span className="truncate text-sm font-medium text-foreground">{slot.prize || '—'}</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {slot.backend_chance || '0%'} chance
            {isRespin && slot.quantity ? ` · ${slot.quantity} respin${slot.quantity > 1 ? 's' : ''}` : ''}
          </div>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Reward type
            </label>
            <Select
              value={reward}
              onChange={onChangeType}
              options={REWARD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              disabled={!canEdit || isSaving}
            />
          </div>

          <Input
            label="Prize label"
            value={slot.prize}
            onChange={(e) => onUpdate({ prize: e.target.value })}
            placeholder="e.g. $11 or 1 Respin"
            disabled={!canEdit || isSaving}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              value={isMoney ? slot.amount : '0'}
              onChange={(e) => onUpdate({ amount: e.target.value })}
              disabled={!canEdit || isSaving || !isMoney}
              placeholder="0.00"
            />
            <Input
              label="Quantity"
              type="number"
              step="1"
              min="1"
              value={isRespin ? String(slot.quantity ?? 1) : ''}
              onChange={(e) =>
                onUpdate({
                  quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              disabled={!canEdit || isSaving || !isRespin}
              placeholder="—"
            />
          </div>

          <Input
            label="Chance %"
            value={slot.backend_chance}
            onChange={(e) => onUpdate({ backend_chance: e.target.value })}
            placeholder="e.g. 12%"
            disabled={!canEdit || isSaving}
          />

          <div className="flex items-center justify-between border-t border-border pt-2">
            <div className="flex items-center gap-0.5">
              <IconButton
                onClick={() => onMove(-1)}
                disabled={!canEdit || isSaving || index === 0}
                label="Move up"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </IconButton>
              <IconButton
                onClick={() => onMove(1)}
                disabled={!canEdit || isSaving || index === total - 1}
                label="Move down"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </IconButton>
            </div>
            <IconButton
              onClick={onRemove}
              disabled={!canRemove}
              label={canRemove ? 'Remove slot' : `Minimum ${minRewards} slots required`}
              danger
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Bundles drawer content ----------

interface BundlesContentProps {
  customBundles: CustomBundle[];
  onApply: (bundle: BundlePreset | CustomBundle) => void;
  onDeleteCustom: (id: string) => void;
}

function BundlesContent({
  customBundles,
  onApply,
  onDeleteCustom,
}: BundlesContentProps) {
  const [tab, setTab] = useState<'curated' | 'custom'>('curated');

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
        <button
          type="button"
          onClick={() => setTab('curated')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'curated'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Curated <span className="ml-0.5 opacity-60">({BUNDLE_PRESETS.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('custom')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'custom'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My bundles <span className="ml-0.5 opacity-60">({customBundles.length})</span>
        </button>
      </div>

      {/* Lists */}
      {tab === 'curated' ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {BUNDLE_PRESETS.map((bundle) => (
            <BundleCard
              key={bundle.id}
              name={bundle.name}
              tagline={bundle.tagline}
              description={bundle.description}
              badge={bundle.badge}
              slots={bundle.slots}
              onApply={() => onApply(bundle)}
            />
          ))}
        </div>
      ) : customBundles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No custom bundles yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Save your current wheel as a bundle to reuse it later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {customBundles.map((bundle) => (
            <BundleCard
              key={bundle.id}
              name={bundle.name}
              tagline={bundle.description ?? 'Custom bundle'}
              description={`${bundle.slots.length} slots`}
              slots={bundle.slots}
              onApply={() => onApply(bundle)}
              onDelete={() => onDeleteCustom(bundle.id)}
              custom
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BundleCardProps {
  name: string;
  tagline: string;
  description?: string;
  badge?: string;
  slots: BundleSlot[];
  onApply: () => void;
  onDelete?: () => void;
  custom?: boolean;
}

function BundleCard({
  name,
  tagline,
  description,
  badge,
  slots,
  onApply,
  onDelete,
  custom,
}: BundleCardProps) {
  const total = Math.round(sumChance(slots) * 100) / 100;

  // Count slot types
  const counts = slots.reduce<Record<string, number>>((acc, s) => {
    const t = normalizeRewardType(String(s.reward_type));
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="group flex flex-col rounded-lg border border-border bg-background p-3.5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-sm font-semibold text-foreground">{name}</h4>
            {badge && (
              <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{tagline}</p>
        </div>
        {custom && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
            aria-label="Delete bundle"
            title="Delete bundle"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {slots.length} slots
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${
            total === 100
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}
        >
          {total}%
        </span>
        {Object.entries(counts).map(([type, count]) => {
          const o = optionFor(normalizeRewardType(type));
          if (!o) return null;
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {o.icon}
              {count}× {o.shortLabel}
            </span>
          );
        })}
      </div>

      {description && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{description}</p>
      )}

      {/* Actions */}
      <div className="mt-3 pt-0.5">
        <Button type="button" size="sm" onClick={onApply} className="w-full">
          Apply as wheel
        </Button>
      </div>
    </div>
  );
}
