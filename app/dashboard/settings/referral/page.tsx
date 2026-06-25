'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useReferralSettingsStore } from '@/stores';
import { Button, Switch, Skeleton, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

type FormFieldKey =
  | 'referrer_bonus_percentage'
  | 'referrer_bonus_cap'
  | 'referred_player_bonus_amount'
  | 'first_deposit_min_amount';

type ReferralSettingField = {
  key: FormFieldKey;
  label: string;
  description: string;
  suffix: '%' | '$';
};

const REFERRER_FIELDS: ReferralSettingField[] = [
  {
    key: 'referrer_bonus_percentage',
    label: 'Bonus percentage',
    description: 'Share of the referred player’s first deposit paid to the referrer.',
    suffix: '%',
  },
  {
    key: 'referrer_bonus_cap',
    label: 'Bonus cap',
    description: 'Maximum amount a referrer can earn per successful referral.',
    suffix: '$',
  },
];

const REFERRED_PLAYER_FIELDS: ReferralSettingField[] = [
  {
    key: 'referred_player_bonus_amount',
    label: 'Signup bonus',
    description: 'Flat bonus credited to the new player when eligibility is met.',
    suffix: '$',
  },
  {
    key: 'first_deposit_min_amount',
    label: 'Minimum first deposit',
    description: 'Lowest first deposit that triggers referral rewards.',
    suffix: '$',
  },
];

type NumericFieldProps = {
  field: ReferralSettingField;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function NumericField({ field, value, error, disabled, onChange }: NumericFieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (nextValue === '' || /^\d*\.?\d*$/.test(nextValue)) {
      onChange(nextValue);
    }
  };

  const handleBlur = () => {
    if (value === '' || value === '.') {
      onChange('0');
      return;
    }

    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      onChange(String(parsed));
    }
  };

  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 py-5 last:border-b-0 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <label
          htmlFor={field.key}
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          {field.label}
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400">{field.description}</p>
        {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
      </div>
      <div className="relative w-full shrink-0 sm:w-36">
        <Input
          id={field.key}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`pr-8 ${error ? 'border-red-500' : ''}`}
          placeholder="0.00"
          disabled={disabled}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
          {field.suffix}
        </span>
      </div>
    </div>
  );
}

const parseNumericField = (value: string) => {
  if (value === '' || value === '.') return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function ReferralSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    is_enabled: false,
    referrer_bonus_percentage: '0',
    referrer_bonus_cap: '0',
    referred_player_bonus_amount: '0',
    first_deposit_min_amount: '0',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { referralSettings, isLoading, error, fetchReferralSettings, patchReferralSettings } =
    useReferralSettingsStore();

  useEffect(() => {
    if (user?.role === USER_ROLES.STAFF) {
      router.push('/dashboard/settings');
    }
  }, [user?.role, router]);

  useEffect(() => {
    if (user?.role !== USER_ROLES.STAFF) {
      fetchReferralSettings();
    }
  }, [fetchReferralSettings, user?.role]);

  useEffect(() => {
    if (referralSettings) {
      setFormData({
        is_enabled: Boolean(referralSettings.is_enabled),
        referrer_bonus_percentage: referralSettings.referrer_bonus_percentage,
        referrer_bonus_cap: referralSettings.referrer_bonus_cap,
        referred_player_bonus_amount: referralSettings.referred_player_bonus_amount,
        first_deposit_min_amount: referralSettings.first_deposit_min_amount,
      });
    }
  }, [referralSettings]);

  const numericFormData = useMemo(
    () => ({
      is_enabled: formData.is_enabled,
      referrer_bonus_percentage: parseNumericField(formData.referrer_bonus_percentage),
      referrer_bonus_cap: parseNumericField(formData.referrer_bonus_cap),
      referred_player_bonus_amount: parseNumericField(formData.referred_player_bonus_amount),
      first_deposit_min_amount: parseNumericField(formData.first_deposit_min_amount),
    }),
    [formData],
  );

  const previewText = useMemo(
    () => ({
      referrer: `Earn ${numericFormData.referrer_bonus_percentage}% (up to ${formatCurrency(numericFormData.referrer_bonus_cap)}) on a referred player’s first deposit.`,
      referred: `Receive ${formatCurrency(numericFormData.referred_player_bonus_amount)} when the first deposit is at least ${formatCurrency(numericFormData.first_deposit_min_amount)}.`,
    }),
    [numericFormData],
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (
      numericFormData.referrer_bonus_percentage < 0 ||
      numericFormData.referrer_bonus_percentage > 100
    ) {
      newErrors.referrer_bonus_percentage = 'Must be between 0 and 100';
    }

    if (numericFormData.referrer_bonus_cap < 0) {
      newErrors.referrer_bonus_cap = 'Must be 0 or greater';
    }

    if (numericFormData.referred_player_bonus_amount < 0) {
      newErrors.referred_player_bonus_amount = 'Must be 0 or greater';
    }

    if (numericFormData.first_deposit_min_amount < 0) {
      newErrors.first_deposit_min_amount = 'Must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await patchReferralSettings(numericFormData);
      addToast({
        type: 'success',
        title: 'Referral settings updated',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update referral settings';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (key: FormFieldKey, value: string) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error && !referralSettings) {
    return <ErrorState message={error} onRetry={fetchReferralSettings} />;
  }

  const controlsDisabled = isSubmitting || !formData.is_enabled;
  const lastUpdated = referralSettings?.modified ? formatDate(referralSettings.modified) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              Referral Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
              Configure how players earn rewards when they refer friends. Changes apply platform-wide
              once saved.
            </p>
            {lastUpdated ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Last updated {lastUpdated}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            form="referral-settings-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="shrink-0 self-start"
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      <form id="referral-settings-form" onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-6 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Referral program
              </h2>
              <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                Turn the player referral program on or off. When disabled, reward fields are saved
                but not active for players.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formData.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={formData.is_enabled}
                onChange={(checked) =>
                  setFormData((previous) => ({
                    ...previous,
                    is_enabled: checked,
                  }))
                }
                disabled={isSubmitting}
                tone="emerald"
              />
            </div>
          </div>

          <div className={`px-6 ${controlsDisabled ? 'opacity-60' : ''}`}>
            <div className="border-b border-gray-200 py-5 dark:border-gray-700">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Referrer rewards
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                What existing players earn when someone they referred makes a qualifying first
                deposit.
              </p>
              <div className="mt-2">
                {REFERRER_FIELDS.map((field) => (
                  <NumericField
                    key={field.key}
                    field={field}
                    value={formData[field.key]}
                    error={errors[field.key]}
                    disabled={controlsDisabled}
                    onChange={(value) => handleFieldChange(field.key, value)}
                  />
                ))}
              </div>
            </div>

            <div className="py-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Referred player rewards
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                What new players receive when they sign up through a referral and meet the deposit
                requirement.
              </p>
              <div className="mt-2">
                {REFERRED_PLAYER_FIELDS.map((field) => (
                  <NumericField
                    key={field.key}
                    field={field}
                    value={formData[field.key]}
                    error={errors[field.key]}
                    disabled={controlsDisabled}
                    onChange={(value) => handleFieldChange(field.key, value)}
                  />
                ))}
              </div>
            </div>
          </div>

          {!formData.is_enabled ? (
            <div className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
              Referral program is disabled. Enable it above to activate these rewards for players.
            </div>
          ) : null}

          <div className="border-t border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-700 dark:bg-gray-900/40">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Player-facing preview
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Referrer sees
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{previewText.referrer}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Referred player sees
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{previewText.referred}</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
