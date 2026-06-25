'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useReferralSettingsStore } from '@/stores';
import { Button, Switch, Skeleton, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/features';
import { formatCurrency } from '@/lib/utils/formatters';

type FormFieldKey =
  | 'referrer_bonus_percentage'
  | 'referrer_bonus_cap'
  | 'referred_player_bonus_amount'
  | 'first_deposit_min_amount';

type ReferralSettingField = {
  key: FormFieldKey;
  label: string;
  suffix: '%' | '$';
};

const REFERRAL_FIELDS: ReferralSettingField[] = [
  { key: 'referrer_bonus_percentage', label: 'Referrer bonus %', suffix: '%' },
  { key: 'referrer_bonus_cap', label: 'Referrer bonus cap', suffix: '$' },
  { key: 'referred_player_bonus_amount', label: 'Referred player bonus', suffix: '$' },
  { key: 'first_deposit_min_amount', label: 'Min. first deposit', suffix: '$' },
];

function NumericField({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: ReferralSettingField;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
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
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-700">
      <label htmlFor={field.key} className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {field.label}
      </label>
      <div className="relative w-32 shrink-0">
        <Input
          id={field.key}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`pr-7 text-right ${error ? 'border-red-500' : ''}`}
          placeholder="0"
          disabled={disabled}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (
      numericFormData.referrer_bonus_percentage < 0 ||
      numericFormData.referrer_bonus_percentage > 100
    ) {
      newErrors.referrer_bonus_percentage = '0–100';
    }
    if (numericFormData.referrer_bonus_cap < 0) newErrors.referrer_bonus_cap = '≥ 0';
    if (numericFormData.referred_player_bonus_amount < 0) {
      newErrors.referred_player_bonus_amount = '≥ 0';
    }
    if (numericFormData.first_deposit_min_amount < 0) {
      newErrors.first_deposit_min_amount = '≥ 0';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      addToast({ type: 'error', title: 'Check your values' });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await patchReferralSettings(numericFormData);
      addToast({ type: 'success', title: 'Saved' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }

  if (error && !referralSettings) {
    return <ErrorState message={error} onRetry={fetchReferralSettings} />;
  }

  const controlsDisabled = isSubmitting || !formData.is_enabled;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-[#eff3ff] px-4 py-3 dark:border-gray-700 dark:bg-indigo-950/30 sm:px-6 sm:py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">
          Referral Settings
        </h1>
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Program</span>
          <Switch
            checked={formData.is_enabled}
            onChange={(checked) => setFormData((p) => ({ ...p, is_enabled: checked }))}
            disabled={isSubmitting}
            tone="emerald"
          />
        </div>

        <div className={`px-4 sm:px-6 ${controlsDisabled ? 'opacity-50' : ''}`}>
          {REFERRAL_FIELDS.map((field) => (
            <NumericField
              key={field.key}
              field={field}
              value={formData[field.key]}
              error={errors[field.key]}
              disabled={controlsDisabled}
              onChange={(value) => setFormData((p) => ({ ...p, [field.key]: value }))}
            />
          ))}
        </div>

        <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:px-6">
          <p>
            <span className="font-medium text-gray-700 dark:text-gray-300">Referrer:</span>{' '}
            {numericFormData.referrer_bonus_percentage}% up to{' '}
            {formatCurrency(numericFormData.referrer_bonus_cap)}
          </p>
          <p className="mt-1">
            <span className="font-medium text-gray-700 dark:text-gray-300">Referred:</span>{' '}
            {formatCurrency(numericFormData.referred_player_bonus_amount)} at{' '}
            {formatCurrency(numericFormData.first_deposit_min_amount)} min deposit
          </p>
        </div>
      </div>
    </form>
  );
}
