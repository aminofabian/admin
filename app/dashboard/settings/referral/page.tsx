'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES, canManageReferralPromoCodes } from '@/lib/constants/roles';
import { useReferralSettingsStore } from '@/stores';
import { Button, Switch, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/features';
import { formatCurrency } from '@/lib/utils/formatters';
import { ReferralPromoCodesSection } from '@/components/dashboard/settings/referral-promo-codes-section';

type FormFieldKey =
  | 'referrer_bonus_percentage'
  | 'referrer_bonus_cap'
  | 'referred_player_bonus_amount';

type ReferralSettingField = {
  key: FormFieldKey;
  title: string;
  description: string;
  suffix: '%' | '$';
};

const REFERRAL_FIELDS: ReferralSettingField[] = [
  {
    key: 'referrer_bonus_percentage',
    title: 'Referrer bonus',
    description: '% of first deposit paid to the referrer',
    suffix: '%',
  },
  {
    key: 'referrer_bonus_cap',
    title: 'Referrer cap',
    description: 'Max bonus per successful referral',
    suffix: '$',
  },
  {
    key: 'referred_player_bonus_amount',
    title: 'New player bonus',
    description: 'Flat bonus for the referred player',
    suffix: '$',
  },
];

const parseNumericField = (value: string) => {
  if (value === '' || value === '.') return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function ReferralSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    is_enabled: false,
    referrer_bonus_percentage: '0',
    referrer_bonus_cap: '0',
    referred_player_bonus_amount: '0',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { referralSettings, isLoading, error, fetchReferralSettings, patchReferralSettings } =
    useReferralSettingsStore();

  const canEdit = user?.role === USER_ROLES.COMPANY || user?.role === USER_ROLES.SUPERADMIN;
  const canManagePromoCodes = canManageReferralPromoCodes(user?.role);

  useEffect(() => {
    if (user?.role === USER_ROLES.STAFF) {
      router.push('/dashboard/settings');
      return;
    }
    if (user?.role === USER_ROLES.MANAGER) {
      router.push('/dashboard/settings/referral-promo-codes');
    }
  }, [user?.role, router]);

  useEffect(() => {
    if (canEdit) {
      fetchReferralSettings();
    }
  }, [canEdit, fetchReferralSettings]);

  useEffect(() => {
    if (referralSettings) {
      setFormData({
        is_enabled: Boolean(referralSettings.is_enabled),
        referrer_bonus_percentage: referralSettings.referrer_bonus_percentage,
        referrer_bonus_cap: referralSettings.referrer_bonus_cap,
        referred_player_bonus_amount: referralSettings.referred_player_bonus_amount,
      });
    }
  }, [referralSettings]);

  const numericFormData = useMemo(
    () => ({
      is_enabled: formData.is_enabled,
      referrer_bonus_percentage: parseNumericField(formData.referrer_bonus_percentage),
      referrer_bonus_cap: parseNumericField(formData.referrer_bonus_cap),
      referred_player_bonus_amount: parseNumericField(formData.referred_player_bonus_amount),
    }),
    [formData],
  );

  const handleFieldChange = (key: FormFieldKey, raw: string) => {
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setFormData((previous) => ({ ...previous, [key]: raw }));
    }
  };

  const handleFieldBlur = (key: FormFieldKey) => {
    const value = formData[key];
    if (value === '' || value === '.') {
      setFormData((previous) => ({ ...previous, [key]: '0' }));
      return;
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      setFormData((previous) => ({ ...previous, [key]: String(parsed) }));
    }
  };

  const validateForm = () => {
    const { referrer_bonus_percentage, referrer_bonus_cap, referred_player_bonus_amount } =
      numericFormData;

    if (referrer_bonus_percentage < 0 || referrer_bonus_percentage > 100) {
      addToast({ type: 'error', title: 'Referrer bonus percentage must be between 0 and 100' });
      return false;
    }
    if (referrer_bonus_cap < 0 || referred_player_bonus_amount < 0) {
      addToast({ type: 'error', title: 'Amounts must be 0 or greater' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await patchReferralSettings(numericFormData);
      addToast({ type: 'success', title: 'Referral settings saved' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return <LoadingState />;
  }

  if (!canEdit) {
    return null;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error && !referralSettings) {
    return <ErrorState message={error} onRetry={fetchReferralSettings} />;
  }

  const fieldsDisabled = isSubmitting || !formData.is_enabled;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Referral
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Player referral rewards and signup promo codes.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Program settings
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Referral program
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.is_enabled
                    ? 'Rewards are active for eligible players'
                    : 'Rewards are paused'}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {formData.is_enabled ? 'On' : 'Off'}
                </span>
                <Switch
                  checked={formData.is_enabled}
                  onChange={(checked) =>
                    setFormData((previous) => ({ ...previous, is_enabled: checked }))
                  }
                  disabled={isSubmitting}
                  tone="emerald"
                />
              </div>
            </div>

            <div
              className={`grid gap-4 p-5 sm:grid-cols-3 ${fieldsDisabled ? 'opacity-55' : ''}`}
            >
              {REFERRAL_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label
                    htmlFor={field.key}
                    className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    {field.title}
                  </label>
                  <div className="relative">
                    <Input
                      id={field.key}
                      type="text"
                      inputMode="decimal"
                      value={formData[field.key]}
                      onChange={(event) => handleFieldChange(field.key, event.target.value)}
                      onBlur={() => handleFieldBlur(field.key)}
                      className="pr-8"
                      placeholder="0.00"
                      disabled={fieldsDisabled}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                      {field.suffix}
                    </span>
                  </div>
                  <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
                    {field.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {formData.is_enabled ? (
                  <>
                    Referrer earns{' '}
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {numericFormData.referrer_bonus_percentage}%
                    </span>{' '}
                    (up to {formatCurrency(numericFormData.referrer_bonus_cap)}) on first deposit ·
                    New player gets {formatCurrency(numericFormData.referred_player_bonus_amount)}
                  </>
                ) : (
                  'Enable the program to apply these rewards.'
                )}
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={fetchReferralSettings}
                  disabled={isSubmitting}
                >
                  Refresh
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </section>

      {canManagePromoCodes ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Promo codes
          </h2>
          <ReferralPromoCodesSection />
        </section>
      ) : null}
    </div>
  );
}
