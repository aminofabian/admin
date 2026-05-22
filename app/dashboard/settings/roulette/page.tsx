'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useRouletteSpinAllowanceStore } from '@/stores';
import { Input } from '@/components/ui/input';
import { Button, Switch, useToast, Badge } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';

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
        description: 'Roulette free spin settings updated successfully.',
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

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/95 p-6 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-md">
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>

        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeWidth={2} d="M12 3v2M12 19v2M3 12h2M19 12h2" />
              <circle cx="12" cy="12" r="3" strokeWidth={2} />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-bold text-foreground">Prize Wheel Settings</h2>
            <p className="mt-1 text-muted-foreground">
              Configure how many free spins each player receives per day
            </p>
          </div>
          <Badge variant={isEnabled ? 'success' : 'default'}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        {formError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md flex-1 space-y-2">
            <Switch
              checked={isEnabled}
              onChange={setIsEnabled}
              disabled={isSubmitting}
              label="Enable daily free spins"
            />
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              When disabled, players will not receive automatic free spins on the prize wheel.
            </p>
          </div>
        </div>

        <div className="max-w-xs">
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
          <p className="mt-2 text-sm text-muted-foreground dark:text-slate-400">
            Each player can use up to this many free spins every calendar day. Resets daily.
          </p>
        </div>

        {allowance?.updated_at && (
          <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground dark:border-slate-700 dark:text-slate-400">
            {allowance.set_by_username && (
              <p>
                Last updated by <span className="font-medium text-foreground">{allowance.set_by_username}</span>
              </p>
            )}
            <p>Updated {formatDate(allowance.updated_at)}</p>
            {allowance.created_at && allowance.created_at !== allowance.updated_at && (
              <p>Created {formatDate(allowance.created_at)}</p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
