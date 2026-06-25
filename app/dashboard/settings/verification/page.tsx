'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { verificationSettingsApi } from '@/lib/api';
import { Button, Switch, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';

export default function VerificationSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const [isPhoneEnabled, setIsPhoneEnabled] = useState(false);
  const [isIdentityEnabled, setIsIdentityEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === USER_ROLES.COMPANY || user?.role === USER_ROLES.SUPERADMIN;

  useEffect(() => {
    if (user?.role === USER_ROLES.STAFF || user?.role === USER_ROLES.MANAGER) {
      router.push('/dashboard/settings');
    }
  }, [user?.role, router]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await verificationSettingsApi.get();
      setIsPhoneEnabled(Boolean(data.is_phone_verification_enabled));
      setIsIdentityEnabled(Boolean(data.is_identity_verification_enabled));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load verification settings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canEdit) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const handlePhoneToggle = async (enabled: boolean) => {
    const previousPhone = isPhoneEnabled;
    const previousIdentity = isIdentityEnabled;
    setIsPhoneEnabled(enabled);
    setIsSaving(true);

    try {
      await verificationSettingsApi.update({
        is_phone_verification_enabled: enabled,
        is_identity_verification_enabled: previousIdentity,
      });
      addToast({
        type: 'success',
        title: enabled ? 'Phone verification enabled' : 'Phone verification disabled',
        description: enabled
          ? 'Signups and Complete Profile will require a phone OTP.'
          : 'Signups and Complete Profile will skip the phone OTP step.',
      });
    } catch (err) {
      setIsPhoneEnabled(previousPhone);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to update phone verification setting';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleIdentityToggle = async (enabled: boolean) => {
    const previousPhone = isPhoneEnabled;
    const previousIdentity = isIdentityEnabled;
    setIsIdentityEnabled(enabled);
    setIsSaving(true);

    try {
      await verificationSettingsApi.update({
        is_phone_verification_enabled: previousPhone,
        is_identity_verification_enabled: enabled,
      });
      addToast({
        type: 'success',
        title: enabled ? 'Identity verification enabled' : 'Identity verification disabled',
        description: enabled
          ? 'Complete Profile will require the last 4 digits of SSN.'
          : 'Complete Profile will skip the SSN step.',
      });
    } catch (err) {
      setIsIdentityEnabled(previousIdentity);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to update identity verification setting';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setIsSaving(false);
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

  if (error) {
    return <ErrorState message={error} onRetry={loadSettings} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Verification</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Control phone OTP and identity verification requirements during signup and in the Complete
          Profile flow.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Require phone OTP verification
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              Disable this if your OTP provider is failing so players can still register and complete
              their profile without a phone code. Email verification remains required for signup.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isPhoneEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              checked={isPhoneEnabled}
              onChange={handlePhoneToggle}
              disabled={isSaving}
              tone="emerald"
            />
          </div>
        </div>

        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Require identity verification (SSN)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              When enabled, players must provide the last 4 digits of their SSN during Complete
              Profile. Disable to reduce onboarding friction when identity checks are not needed.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isIdentityEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              checked={isIdentityEnabled}
              onChange={handleIdentityToggle}
              disabled={isSaving}
              tone="emerald"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/40">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isPhoneEnabled
              ? 'Phone: players verify their number with an OTP during signup and Complete Profile.'
              : 'Phone: mobile numbers are collected but not OTP-verified.'}{' '}
            {isIdentityEnabled
              ? 'Identity: Complete Profile includes an SSN (last 4 digits) step.'
              : 'Identity: Complete Profile skips the SSN step.'}
          </p>
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={loadSettings} disabled={isSaving}>
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
