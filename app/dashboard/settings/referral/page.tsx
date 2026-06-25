'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useReferralSettingsStore } from '@/stores';
import {
  Button,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  useToast,
} from '@/components/ui';
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
  description: string;
  suffix: '%' | '$';
  min: number;
  max?: number;
  step: string;
};

const REFERRAL_SETTING_FIELDS: ReferralSettingField[] = [
  {
    key: 'referrer_bonus_percentage',
    label: 'Referrer Bonus Percentage',
    description: 'Percentage of the referred player’s first deposit paid to the referrer.',
    suffix: '%',
    min: 0,
    max: 100,
    step: '0.01',
  },
  {
    key: 'referrer_bonus_cap',
    label: 'Referrer Bonus Cap',
    description: 'Maximum bonus amount a referrer can earn per successful referral.',
    suffix: '$',
    min: 0,
    step: '0.01',
  },
  {
    key: 'referred_player_bonus_amount',
    label: 'Referred Player Bonus',
    description: 'Flat bonus credited to the new player when eligibility is met.',
    suffix: '$',
    min: 0,
    step: '0.01',
  },
  {
    key: 'first_deposit_min_amount',
    label: 'First Deposit Minimum',
    description: 'Minimum first deposit required to trigger referral rewards.',
    suffix: '$',
    min: 0,
    step: '0.01',
  },
];

type SettingRowProps = {
  field: ReferralSettingField;
  value: string;
  error?: string;
  isSubmitting: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
};

function SettingRow({
  field,
  value,
  error,
  isSubmitting,
  disabled,
  onChange,
}: SettingRowProps) {
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
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="space-y-1">
          <p className="font-medium text-gray-900 dark:text-gray-100">{field.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{field.description}</p>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="relative max-w-[220px]">
          <Input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`pr-8 ${error ? 'border-red-500' : ''}`}
            placeholder="0.00"
            disabled={isSubmitting || disabled}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
            {field.suffix}
          </span>
        </div>
        {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
      </TableCell>
    </TableRow>
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
      referrer: `Earn ${numericFormData.referrer_bonus_percentage}% (up to ${formatCurrency(numericFormData.referrer_bonus_cap)}) based on the referred player's first deposit.`,
      referred: `Receives ${formatCurrency(numericFormData.referred_player_bonus_amount)} bonus when their first deposit is at least ${formatCurrency(numericFormData.first_deposit_min_amount)}.`,
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
        <div className="rounded-lg border border-gray-200 bg-[#eff3ff] p-6 dark:border-gray-700 dark:bg-indigo-950/30">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <Skeleton className="mb-4 h-6 w-64" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="border-b border-gray-200 p-4 last:border-b-0 dark:border-gray-700">
              <Skeleton className="mb-2 h-4 w-48" />
              <Skeleton className="h-10 w-40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !referralSettings) {
    return <ErrorState message={error} onRetry={fetchReferralSettings} />;
  }

  const controlsDisabled = isSubmitting || !formData.is_enabled;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-[#eff3ff] dark:border-gray-700 dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 p-4 sm:gap-3 sm:p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="shrink-0 text-xl font-semibold text-gray-900 dark:text-gray-100 sm:text-2xl">
            Referral Settings
          </h2>
          <div className="min-w-0 flex-1" />
          <Button
            type="submit"
            form="referral-settings-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="shrink-0"
          >
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Referral Program
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enable or disable the referral program for your players.
            </p>
          </div>
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
      </section>

      <section className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          Player-facing preview
        </h3>
        <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <span className="font-medium text-gray-900 dark:text-gray-100">Referrer:</span>{' '}
            {previewText.referrer}
          </p>
          <p>
            <span className="font-medium text-gray-900 dark:text-gray-100">Referred player:</span>{' '}
            {previewText.referred}
          </p>
        </div>
      </section>

      <form id="referral-settings-form" onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REFERRAL_SETTING_FIELDS.map((field) => (
                  <SettingRow
                    key={field.key}
                    field={field}
                    value={formData[field.key]}
                    error={errors[field.key]}
                    isSubmitting={isSubmitting}
                    disabled={controlsDisabled}
                    onChange={(value) => handleFieldChange(field.key, value)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </form>
    </div>
  );
}
