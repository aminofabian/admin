'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { FirstPurchaseBonusPageContent } from './first-page-content';
import { StaffFirstPurchaseBonusPage } from '@/components/staff/staff-first-purchase-bonus-page';

export default function FirstPurchaseBonusPage() {
  const { user } = useAuth();

  // If user is staff or manager, render read-only view
  if (user?.role === USER_ROLES.STAFF || user?.role === USER_ROLES.MANAGER) {
    return <StaffFirstPurchaseBonusPage />;
  }

  return <FirstPurchaseBonusPageContent />;
}