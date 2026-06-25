'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { phoneVerificationSettingsApi } from '@/lib/api';
import { Button, Switch, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';

export default function PhoneVerificationSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const [isEnabled, setIsEnabled] = useState(false);
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
      const data = await phoneVerificationSettingsApi.get();
      setIsEnabled(Boolean(data.is_phone_verification_enabled));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load phone verification settings';
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

  const handleToggle = async (enabled: boolean) => {
    const previous = isEnabled;
    setIsEnabled(enabled);
    setIsSaving(true);

    try {
      await phoneVerificationSettingsApi.update({
        is_phone_verification_enabled: enabled,
      });
      addToast({
        type: 'success',
        title: enabled ? 'Phone verification enabled' : 'Phone verification disabled',
        description: enabled
          ? 'New signups will require a phone OTP.'
          : 'New signups will skip the phone OTP step.',
      });
    } catch (err) {
      setIsEnabled(previous);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Phone Verification
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Control whether new player signups must verify their phone number with an OTP.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Require phone OTP during signup
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              Disable this if your OTP provider is failing so players can still register.
              Email verification remains required.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              checked={isEnabled}
              onChange={handleToggle}
              disabled={isSaving}
              tone="emerald"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/40">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isEnabled
              ? 'Players complete email verification, profile details, then a phone OTP before their account is created.'
              : 'Players complete email verification and profile details; phone number is collected but not OTP-verified.'}
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={loadSettings}
              disabled={isSaving}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
