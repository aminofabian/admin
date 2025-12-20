'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { ManagersList } from '@/components/features';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ErrorState } from '@/components/features';

export default function ManagersPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Managers cannot access the managers list
  if (user?.role === USER_ROLES.MANAGER) {
    return (
      <ErrorState
        message="Access Denied: You do not have permission to view managers."
        onRetry={() => router.push('/dashboard')}
      />
    );
  }

  return <ManagersList />;
}