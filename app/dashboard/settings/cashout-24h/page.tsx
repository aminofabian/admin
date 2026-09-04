'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useCashout24hSettingsStore } from '@/stores';
import { Button, Switch, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/features';

export default function Cashout24hSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const [noLimit, setNoLimit] = useState(true);
  const [limitInput, setLimitInput] = useState('0.00');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    companyDefault,
    isLoading,
    error,
    fetchCompanyDefault,
    patchCompanyDefault,
  } = useCashout24hSettingsStore();

  const canEdit =
    user?.role === USER_ROLES.COMPANY ||
    user?.role === USER_ROLES.SUPERADMIN ||
    user?.role === USER_ROLES.MANAGER;

  useEffect(() => {
    if (!user?.role) return;
    if (user.role === USER_ROLES.STAFF) {
      router.push('/dashboard/settings');
    }
  }, [user?.role, router]);

  useEffect(() => {
    if (canEdit) void fetchCompanyDefault();
  }, [canEdit, fetchCompanyDefault]);

  useEffect(() => {
    if (!companyDefault) return;
    if (companyDefault.cashout_24h_limit == null) {
      setNoLimit(true);
      setLimitInput('0.00');
    } else {
      setNoLimit(false);
      setLimitInput(String(companyDefault.cashout_24h_limit));
    }
  }, [companyDefault]);

  const handleLimitChange = (raw: string) => {
    if (raw === '' || /^\d*\.?\d{0,2}$/.test(raw)) {
      setLimitInput(raw);
      setFieldError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(null);

    let payload: string | null = null;
    if (!noLimit) {
      const trimmed = limitInput.trim();
      if (trimmed === '' || trimmed === '.') {
        setFieldError('Enter a limit amount, or enable “No 24-hour limit”');
        return;
      }
      const parsed = Number.parseFloat(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFieldError('Enter a valid amount of 0.00 or greater');
        return;
      }
      // "0.00" intentionally blocks cashouts — it is not unlimited
      payload = parsed.toFixed(2);
    }

    setIsSubmitting(true);
    try {
      const saved = await patchCompanyDefault(payload);
      if (saved.cashout_24h_limit == null) {
        setNoLimit(true);
        setLimitInput('0.00');
      } else {
        setNoLimit(false);
        setLimitInput(String(saved.cashout_24h_limit));
      }
      addToast({ type: 'success', title: 'Saved' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save';
      setFieldError(message);
      addToast({
        type: 'error',
        title: 'Could not save',
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoading) return <LoadingState />;
  if (!canEdit) return null;
  if (error && !companyDefault) {
    return <ErrorState message={error} onRetry={fetchCompanyDefault} />;
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          24-Hour Cashout Limit
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Company default for the rolling 24-hour cashout cap. This is separate from each
          player&apos;s wallet cashout limit (withdrawable balance). Player overrides take
          precedence when set.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Company default
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Rolling window from the request time (not midnight-to-midnight). Completed and
            processing cashouts use allowance; pending requests do not.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                No 24-hour limit
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                When enabled, the company default is unlimited (null).
              </p>
            </div>
            <Switch
              checked={noLimit}
              onChange={(checked) => {
                setNoLimit(checked);
                setFieldError(null);
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-[1fr_7.5rem] items-start gap-4 py-2">
            <div className="min-w-0">
              <label
                htmlFor="cashout_24h_limit"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                24-Hour Cashout Limit
              </label>
              <p
                id="cashout_24h_limit_hint"
                className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              >
                Minimum 0.00. A value of 0.00 blocks cashouts unless a player has a positive
                override — it is not unlimited.
              </p>
            </div>
            <div className="relative">
              <Input
                id="cashout_24h_limit"
                type="text"
                inputMode="decimal"
                value={noLimit ? '' : limitInput}
                onChange={(e) => handleLimitChange(e.target.value)}
                className="pr-7 text-right tabular-nums"
                placeholder="0.00"
                disabled={isSubmitting || noLimit}
                aria-describedby={
                  fieldError ? 'cashout_24h_limit_error cashout_24h_limit_hint' : 'cashout_24h_limit_hint'
                }
                aria-invalid={!!fieldError}
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                $
              </span>
            </div>
          </div>

          {fieldError ? (
            <p
              id="cashout_24h_limit_error"
              className="text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {fieldError}
            </p>
          ) : null}

          <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-700/80">
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
