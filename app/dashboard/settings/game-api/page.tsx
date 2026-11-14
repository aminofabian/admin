'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { Category2GameApiToggle } from '@/components/superadmin/category2-game-api-toggle';
import { LoadingState } from '@/components/features';

export default function GameApiSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isSuperAdmin = user?.role === USER_ROLES.SUPERADMIN;

  useEffect(() => {
    if (!isLoading && user && !isSuperAdmin) {
      router.replace('/dashboard/settings');
    }
  }, [isLoading, isSuperAdmin, router, user]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Category 2 Game API</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Switch category 2 games between game API v1 and v2 without a deploy.
        </p>
      </div>
      <Category2GameApiToggle />
    </div>
  );
}
