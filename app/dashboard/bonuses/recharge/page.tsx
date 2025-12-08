'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { RechargeBonusPageContent } from './recharge-content';
import { StaffRechargeBonusPage } from '@/components/staff/staff-recharge-bonus-page';

export default function RechargeBonusPage() {
  const { user } = useAuth();

  // If user is staff or manager, render read-only view
  if (user?.role === USER_ROLES.STAFF || user?.role === USER_ROLES.MANAGER) {
    return <StaffRechargeBonusPage />;
  }

  return <RechargeBonusPageContent />;
}
