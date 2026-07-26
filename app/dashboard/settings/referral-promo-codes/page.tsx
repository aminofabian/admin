'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canManageReferralPromoCodes } from '@/lib/constants/roles';
import { LoadingState } from '@/components/features';
import { ReferralPromoCodesSection } from '@/components/dashboard/settings/referral-promo-codes-section';

export default function ReferralPromoCodesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const canManage = canManageReferralPromoCodes(user?.role);

  useEffect(() => {
    if (!isAuthLoading && !canManage) {
      router.push('/dashboard/settings');
    }
  }, [canManage, isAuthLoading, router]);

  if (isAuthLoading || !canManage) {
    return <LoadingState />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Promo codes
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Custom signup codes with per-code bonuses.
        </p>
      </header>

      <ReferralPromoCodesSection />
    </div>
  );
}
