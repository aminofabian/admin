'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES, canEditRouletteRewards } from '@/lib/constants/roles';
import { useRouletteSpinAllowanceStore, useRouletteRewardConfigsStore } from '@/stores';
import { Input } from '@/components/ui/input';
import { Button, Switch, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import { RouletteRewardConfigsEditor } from '@/components/dashboard/settings/roulette-reward-configs-editor';

export default function RouletteSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [spinsPerDay, setSpinsPerDay] = useState('0');
  const [isEnabled, setIsEnabled] = useState(false);
  const [rouletteEnabled, setRouletteEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingRoulette, setIsSavingRoulette] = useState(false);
  const [isSavingSpins, setIsSavingSpins] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { allowance, isLoading, error, fetchAllowance, saveAllowance } =
    useRouletteSpinAllowanceStore();
  const { config } = useRouletteRewardConfigsStore();

  useEffect(() => {
    if (user?.role === USER_ROLES.STAFF) {
      router.push('/dashboard/settings');
    }
  }, [user?.role, router]);

  useEffect(() => {
    if (user?.role !== USER_ROLES.STAFF) {
      fetchAllowance();
    }
  }, [fetchAllowance, user?.role]);

  useEffect(() => {
    if (allowance) {
      setSpinsPerDay(String(allowance.spins_per_day ?? 0));
      setIsEnabled(Boolean(allowance.is_enabled));
      setRouletteEnabled(Boolean(allowance.roulette_enabled));
    }
  }, [allowance]);

  const parseSpinsPerDay = () => parseInt(spinsPerDay, 10);

  const validateSpinsPerDay = (enabled: boolean, value = parseSpinsPerDay()) => {
    if (Number.isNaN(value) || value < 0) {
      setFormError('Spins per day must be 0 or greater');
      return false;
    }
    if (enabled && value < 1) {
      setFormError('Set at least 1 spin per day when enabled');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleRouletteToggle = async (enabled: boolean) => {
    const previous = rouletteEnabled;
    setRouletteEnabled(enabled);
    setIsSavingRoulette(true);

    try {
      await saveAllowance({
        spins_per_day: parseInt(spinsPerDay, 10),
        is_enabled: isEnabled,
        roulette_enabled: enabled,
      });
      addToast({
        type: 'success',
        title: enabled ? 'Wheel enabled' : 'Wheel disabled',
      });
    } catch (err) {
      setRouletteEnabled(previous);
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Failed to update prize wheel',
      });
    } finally {
      setIsSavingRoulette(false);
    }
  };

  const handleSpinsToggle = async (enabled: boolean) => {
    const previous = isEnabled;
    let spins = parseSpinsPerDay();

    if (enabled && (Number.isNaN(spins) || spins < 1)) {
      const fallback =
        allowance?.spins_per_day && allowance.spins_per_day >= 1
          ? allowance.spins_per_day
          : 1;
      spins = fallback;
      setSpinsPerDay(String(fallback));
    }

    if (!validateSpinsPerDay(enabled, spins)) return;

    setIsEnabled(enabled);
    setIsSavingSpins(true);

    try {
      await saveAllowance({
        spins_per_day: spins,
        is_enabled: enabled,
        roulette_enabled: rouletteEnabled,
      });
      addToast({
        type: 'success',
        title: enabled ? 'Free spins on' : 'Free spins off',
      });
    } catch (err) {
      setIsEnabled(previous);
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Failed to update free spins',
      });
    } finally {
      setIsSavingSpins(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSpinsPerDay(isEnabled)) return;

    setIsSubmitting(true);
    try {
      await saveAllowance({
        spins_per_day: parseSpinsPerDay(),
        is_enabled: isEnabled,
        roulette_enabled: rouletteEnabled,
      });
      addToast({ type: 'success', title: 'Saved' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error && !allowance) {
    return <ErrorState message={error} onRetry={fetchAllowance} />;
  }

  const slotCount = config?.rewards?.length ?? 0;
  const usingDefault = Boolean(config?.using_default);
  const lastUpdatedLabel = allowance?.updated_at
    ? `Updated ${formatDate(allowance.updated_at)}${
        allowance.set_by_username ? ` · by ${allowance.set_by_username}` : ''
      }`
    : null;

  const controlsDisabled = isSubmitting || isSavingRoulette || isSavingSpins;
  const spinsDisabled = controlsDisabled || !isEnabled;

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Prize wheel</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Wheel availability, free spins, and prize slots.
        </p>
      </header>

      {/* Availability */}
      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Availability</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {slotCount ? `${slotCount} slots` : 'No slots'} ·{' '}
            {usingDefault ? 'Platform default' : 'Custom config'}
            {lastUpdatedLabel ? ` · ${lastUpdatedLabel}` : ''}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Prize wheel</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {rouletteEnabled ? 'Visible to players' : 'Hidden from players'}
              {isSavingRoulette ? ' · saving…' : ''}
            </p>
          </div>
          <Switch
            checked={rouletteEnabled}
            onChange={handleRouletteToggle}
            disabled={controlsDisabled}
            tone="emerald"
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Daily free spins</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isEnabled ? 'Granted after first deposit each day' : 'Off'}
                {isSavingSpins ? ' · saving…' : ''}
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onChange={handleSpinsToggle}
              disabled={controlsDisabled}
              tone="emerald"
            />
          </div>

          <div
            className={`space-y-3 px-5 py-4 ${spinsDisabled ? 'pointer-events-none opacity-40' : ''}`}
          >
            {formError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:w-40">
                <label
                  htmlFor="spins-per-day"
                  className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Max per day
                </label>
                <Input
                  id="spins-per-day"
                  type="number"
                  min="0"
                  step="1"
                  value={spinsPerDay}
                  onChange={(e) => setSpinsPerDay(e.target.value)}
                  placeholder="3"
                  disabled={spinsDisabled}
                  className="tabular-nums"
                />
              </div>
              <Button type="submit" size="sm" disabled={spinsDisabled}>
                {isSubmitting ? 'Saving…' : 'Save limit'}
              </Button>
            </div>
          </div>
        </form>
      </section>

      {/* Slots */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Prize slots</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Configure each slot on the wheel. Chances must total 100%.
          </p>
        </div>
        <RouletteRewardConfigsEditor canEdit={canEditRouletteRewards(user?.role)} />
      </section>
    </div>
  );
}
