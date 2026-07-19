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
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Referral Promo Codes
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create and manage custom promo codes used during player signup.
        </p>
      </div>

      <ReferralPromoCodesSection />
    </div>
  );
}
