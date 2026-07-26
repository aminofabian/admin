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
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Promo codes</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Custom codes with their own signup bonus.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Codes</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Create, edit bonuses, and activate or remove codes.
          </p>
        </div>
        <div className="px-5 py-4">
          <ReferralPromoCodesSection embedded />
        </div>
      </section>
    </div>
  );
}
