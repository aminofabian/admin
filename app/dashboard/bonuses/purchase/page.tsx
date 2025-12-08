'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { PurchaseBonusManager } from '@/components/dashboard/data-sections/purchase-bonus-manager';
import { StaffPurchaseBonusPage } from '@/components/staff/staff-purchase-bonus-page';

export default function PurchaseBonusPage() {
  const { user } = useAuth();

  // If user is staff or manager, render read-only view
  if (user?.role === USER_ROLES.STAFF || user?.role === USER_ROLES.MANAGER) {
    return <StaffPurchaseBonusPage />;
  }

  return <PurchaseBonusManager showHeader={true} showStats={true} />;
}
