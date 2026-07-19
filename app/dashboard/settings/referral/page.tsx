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
    title: 'Referrer bonus percentage',
    description: 'Percentage of the referred player’s first deposit paid to the referrer.',
    suffix: '%',
  },
  {
    key: 'referrer_bonus_cap',
    title: 'Referrer bonus cap',
    description: 'Maximum bonus a referrer can earn per successful referral.',
    suffix: '$',
  },
  {
    key: 'referred_player_bonus_amount',
    title: 'Referred player bonus',
    description: 'Flat bonus for the new player when eligibility is met.',
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
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Referral</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure player referral rewards and custom promo codes.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Enable referral program
              </h2>
              <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                When disabled, referral rewards are not active for players.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formData.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={formData.is_enabled}
                onChange={(checked) => setFormData((previous) => ({ ...previous, is_enabled: checked }))}
                disabled={isSubmitting}
                tone="emerald"
              />
            </div>
          </div>

          {REFERRAL_FIELDS.map((field, index) => (
            <div
              key={field.key}
              className={`flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between ${
                index < REFERRAL_FIELDS.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
              } ${fieldsDisabled ? 'opacity-60' : ''}`}
            >
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{field.title}</h2>
                <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">{field.description}</p>
              </div>
              <div className="relative w-full shrink-0 sm:w-36">
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
            </div>
          ))}

          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/40">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formData.is_enabled
                ? `Referrer: earn ${numericFormData.referrer_bonus_percentage}% (up to ${formatCurrency(numericFormData.referrer_bonus_cap)}) on a referred player’s first deposit. `
                : 'Referral program is disabled. '}
              Referred player: {formatCurrency(numericFormData.referred_player_bonus_amount)} bonus.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={fetchReferralSettings}
                disabled={isSubmitting}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </form>

      {canManagePromoCodes ? <ReferralPromoCodesSection /> : null}
    </div>
  );
}
