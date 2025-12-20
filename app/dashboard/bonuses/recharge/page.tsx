'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { RechargeBonusPageContent } from './recharge-content';
import { StaffRechargeBonusPage } from '@/components/staff/staff-recharge-bonus-page';

export default function RechargeBonusPage() {
  const { user } = useAuth();

  // If user is staff, render read-only view
  if (user?.role === USER_ROLES.STAFF) {
    return <StaffRechargeBonusPage />;
  }

  // Managers and company users get the same component with edit functionality
  return <RechargeBonusPageContent />;
}
