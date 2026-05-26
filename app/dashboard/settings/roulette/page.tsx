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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    }
  }, [allowance]);

  const validateForm = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await saveAllowance({
        spins_per_day: parseInt(spinsPerDay, 10),
        is_enabled: isEnabled,
      });
      addToast({
        type: 'success',
        title: 'Saved',
        description: 'Daily free spins updated.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      addToast({
        type: 'error',
        title: 'Save failed',
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-24 sm:space-y-5 sm:pb-6">
      {/* Header */}
      <section className="rounded-2xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
              <svg className="h-5 w-5 sm:h-5.5 sm:w-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground sm:text-xl">Prize Wheel</h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    isEnabled
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isEnabled ? 'bg-primary' : 'bg-muted-foreground/60'
                    }`}
                  />
                  {isEnabled ? 'Live' : 'Paused'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Configure daily free spins and the rewards players can win.
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 sm:max-w-xs sm:gap-3">
            <Stat label="Spins/day" value={isEnabled ? spinsPerDay || '0' : '—'} />
            <Stat label="Slots" value={slotCount ? String(slotCount) : '—'} />
            <Stat label="Mode" value={usingDefault ? 'Default' : 'Custom'} />
          </div>
        </div>
      </section>

      {/* Daily free spins */}
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">Daily free spins</h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Each player can use up to this many free spins per calendar day. Resets at midnight.
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onChange={setIsEnabled}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-3 px-5 py-4 sm:px-6">
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300 sm:text-sm">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-[200px]">
              <Input
                label="Free spins per day"
                type="number"
                min="0"
                step="1"
                value={spinsPerDay}
                onChange={(e) => setSpinsPerDay(e.target.value)}
                placeholder="e.g. 5"
                disabled={isSubmitting || !isEnabled}
              />
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              {lastUpdatedLabel && (
                <p className="hidden text-xs text-muted-foreground sm:block">{lastUpdatedLabel}</p>
              )}
              <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          {lastUpdatedLabel && (
            <p className="text-xs text-muted-foreground sm:hidden">{lastUpdatedLabel}</p>
          )}
        </div>
      </form>

      {/* Wheel composer */}
      <RouletteRewardConfigsEditor canEdit={canEditRouletteRewards(user?.role)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 sm:px-3 sm:py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-foreground sm:text-base">
        {value}
      </div>
    </div>
  );
}
