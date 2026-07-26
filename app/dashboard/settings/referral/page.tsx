'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES, canManageReferralPromoCodes } from '@/lib/constants/roles';
import { useReferralSettingsStore } from '@/stores';
import { Button, Switch, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/features';
import { ReferralPromoCodesSection } from '@/components/dashboard/settings/referral-promo-codes-section';

type FormFieldKey =
  | 'referrer_bonus_percentage'
  | 'referrer_bonus_cap'
  | 'referred_player_bonus_amount';

const parseNumericField = (value: string) => {
  if (value === '' || value === '.') return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

function FieldRow({
  id,
  label,
  hint,
  suffix,
  value,
  disabled,
  onChange,
  onBlur,
}: {
  id: FormFieldKey;
  label: string;
  hint?: string;
  suffix: '%' | '$';
  value: string;
  disabled?: boolean;
  onChange: (raw: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_7.5rem] items-center gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </label>
        {hint ? (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="pr-7 text-right tabular-nums"
          placeholder="0"
          disabled={disabled}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {suffix}
        </span>
      </div>
    </div>
  );
}

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
    if (canEdit) fetchReferralSettings();
  }, [canEdit, fetchReferralSettings]);

  useEffect(() => {
    if (!referralSettings) return;
    setFormData({
      is_enabled: Boolean(referralSettings.is_enabled),
      referrer_bonus_percentage: referralSettings.referrer_bonus_percentage,
      referrer_bonus_cap: referralSettings.referrer_bonus_cap,
      referred_player_bonus_amount: referralSettings.referred_player_bonus_amount,
    });
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
      setFormData((prev) => ({ ...prev, [key]: raw }));
    }
  };

  const handleFieldBlur = (key: FormFieldKey) => {
    const value = formData[key];
    if (value === '' || value === '.') {
      setFormData((prev) => ({ ...prev, [key]: '0' }));
      return;
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      setFormData((prev) => ({ ...prev, [key]: String(parsed) }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { referrer_bonus_percentage, referrer_bonus_cap, referred_player_bonus_amount } =
      numericFormData;

    if (referrer_bonus_percentage < 0 || referrer_bonus_percentage > 100) {
      addToast({ type: 'error', title: 'Referrer bonus must be between 0 and 100%' });
      return;
    }
    if (referrer_bonus_cap < 0 || referred_player_bonus_amount < 0) {
      addToast({ type: 'error', title: 'Amounts must be 0 or greater' });
      return;
    }

    setIsSubmitting(true);
    try {
      await patchReferralSettings(numericFormData);
      addToast({ type: 'success', title: 'Saved' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not save',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoading) return <LoadingState />;
  if (!canEdit) return null;
  if (error && !referralSettings) {
    return <ErrorState message={error} onRetry={fetchReferralSettings} />;
  }

  const fieldsDisabled = isSubmitting || !formData.is_enabled;

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Referral</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure referral rewards and signup promo codes.
        </p>
      </header>

      {/* 1 — Rewards */}
      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Rewards</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Defaults for player-to-player referrals.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Status</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.is_enabled ? 'Program is on' : 'Program is off'}
              </p>
            </div>
            <Switch
              checked={formData.is_enabled}
              onChange={(checked) => setFormData((prev) => ({ ...prev, is_enabled: checked }))}
              disabled={isSubmitting}
              tone="emerald"
            />
          </div>

          <div
            className={`divide-y divide-gray-100 px-5 dark:divide-gray-700/80 ${
              fieldsDisabled ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <div className="pt-2">
              <p className="pt-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Referrer
              </p>
              <FieldRow
                id="referrer_bonus_percentage"
                label="Bonus"
                hint="Share of first deposit"
                suffix="%"
                value={formData.referrer_bonus_percentage}
                disabled={fieldsDisabled}
                onChange={(raw) => handleFieldChange('referrer_bonus_percentage', raw)}
                onBlur={() => handleFieldBlur('referrer_bonus_percentage')}
              />
              <FieldRow
                id="referrer_bonus_cap"
                label="Cap"
                hint="Maximum per referral"
                suffix="$"
                value={formData.referrer_bonus_cap}
                disabled={fieldsDisabled}
                onChange={(raw) => handleFieldChange('referrer_bonus_cap', raw)}
                onBlur={() => handleFieldBlur('referrer_bonus_cap')}
              />
            </div>

            <div className="pb-1 pt-2">
              <p className="pt-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                New player
              </p>
              <FieldRow
                id="referred_player_bonus_amount"
                label="Signup bonus"
                hint="Flat amount when eligible"
                suffix="$"
                value={formData.referred_player_bonus_amount}
                disabled={fieldsDisabled}
                onChange={(raw) => handleFieldChange('referred_player_bonus_amount', raw)}
                onBlur={() => handleFieldBlur('referred_player_bonus_amount')}
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save rewards'}
            </Button>
          </div>
        </form>
      </section>

      {/* 2 — Promo codes */}
      {canManagePromoCodes ? (
        <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Promo codes</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Custom codes with their own signup bonus.
            </p>
          </div>
          <div className="px-5 py-4">
            <ReferralPromoCodesSection embedded />
          </div>
        </section>
      ) : null}
    </div>
  );
}
