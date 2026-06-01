'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES, canEditRouletteRewards } from '@/lib/constants/roles';
import { useRouletteSpinAllowanceStore, useRouletteRewardConfigsStore } from '@/stores';
import { Input } from '@/components/ui/input';
import { Button, Switch, useToast, type SwitchTone } from '@/components/ui';
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
      const message = err instanceof Error ? err.message : 'Failed to update prize wheel';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
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
      const message = err instanceof Error ? err.message : 'Failed to update free spins';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
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
      addToast({
        type: 'success',
        title: 'Saved',
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

  const controlsDisabled = isSubmitting || isSavingRoulette || isSavingSpins;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-24 sm:pb-6">
      {/* Header */}
      <section className="rounded-2xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
              <WheelIcon className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground sm:text-xl">Prize Wheel</h1>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:grid-cols-4 sm:gap-3">
            <Stat label="Wheel" value={rouletteEnabled ? 'On' : 'Off'} />
            <Stat label="Free spins" value={isEnabled ? spinsPerDay || '0' : 'Off'} />
            <Stat label="Slots" value={slotCount ? String(slotCount) : '—'} />
            <Stat label="Mode" value={usingDefault ? 'Default' : 'Custom'} />
          </div>
        </div>
      </section>

      {/* Controls — single card, two visually distinct rows */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <SettingRow
          variant="wheel"
          title="Prize wheel"
          description="Show or lock the wheel for all players."
          checked={rouletteEnabled}
          onChange={handleRouletteToggle}
          disabled={controlsDisabled}
          saving={isSavingRoulette}
        />

        <div className="border-t border-border" aria-hidden />

        <form onSubmit={handleSubmit}>
          <SettingRow
            variant="spins"
            title="Daily free spins"
            description="After first purchase each day; unused spins stack."
            checked={isEnabled}
            onChange={handleSpinsToggle}
            disabled={controlsDisabled}
            saving={isSavingSpins}
          >
            {formError && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300 sm:text-sm">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-[200px]">
                <Input
                  label="Maximum per day"
                  type="number"
                  min="0"
                  step="1"
                  value={spinsPerDay}
                  onChange={(e) => setSpinsPerDay(e.target.value)}
                  placeholder="e.g. 3"
                  disabled={controlsDisabled || !isEnabled}
                />
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                {lastUpdatedLabel && (
                  <p className="hidden text-xs text-muted-foreground sm:block">{lastUpdatedLabel}</p>
                )}
                <Button type="submit" disabled={controlsDisabled || !isEnabled} size="sm">
                  {isSubmitting ? 'Saving…' : 'Save limit'}
                </Button>
              </div>
            </div>

            {lastUpdatedLabel && (
              <p className="mt-2 text-xs text-muted-foreground sm:hidden">{lastUpdatedLabel}</p>
            )}
          </SettingRow>
        </form>
      </section>

      <RouletteRewardConfigsEditor canEdit={canEditRouletteRewards(user?.role)} />
    </div>
  );
}

type SettingVariant = 'wheel' | 'spins';

const VARIANT_STYLES: Record<
  SettingVariant,
  {
    switchTone: SwitchTone;
    stripe: string;
    iconWrap: string;
    badgeOn: string;
    badgeOff: string;
  }
> = {
  wheel: {
    switchTone: 'violet',
    stripe: 'bg-violet-500',
    iconWrap: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
    badgeOn: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    badgeOff: 'border-border bg-muted/60 text-muted-foreground',
  },
  spins: {
    switchTone: 'emerald',
    stripe: 'bg-emerald-500',
    iconWrap: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    badgeOn: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    badgeOff: 'border-border bg-muted/60 text-muted-foreground',
  },
};

function SettingRow({
  variant,
  title,
  description,
  checked,
  onChange,
  disabled,
  saving,
  children,
}: {
  variant: SettingVariant;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  saving?: boolean;
  children?: ReactNode;
}) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className="relative flex gap-0 sm:gap-1">
      <div
        className={`w-1 shrink-0 sm:w-1.5 ${styles.stripe}`}
        aria-hidden
      />

      <div className="min-w-0 flex-1 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex gap-3 sm:gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${styles.iconWrap}`}
          >
            {variant === 'wheel' ? (
              <LockWheelIcon className="h-5 w-5" />
            ) : (
              <SpinsIcon className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pr-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      checked ? styles.badgeOn : styles.badgeOff
                    }`}
                  >
                    {checked ? 'On' : 'Off'}
                  </span>
                  {saving && (
                    <span className="text-[10px] text-muted-foreground">…</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              </div>

              <Switch
                tone={styles.switchTone}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="shrink-0"
              />
            </div>

            {children && <div className="mt-3 border-t border-border/60 pt-3">{children}</div>}
          </div>
        </div>
      </div>
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

function WheelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LockWheelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" strokeOpacity={0.35} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 11V8a3 3 0 116 0v3M8 11h8v7H8z"
      />
    </svg>
  );
}

function SpinsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" d="M12 3v3M12 18v3M5 12H2M22 12h-3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.5 8.5a5 5 0 017 7M15.5 15.5a5 5 0 01-7-7"
      />
    </svg>
  );
}
