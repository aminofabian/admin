'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { TransferBonusPageContent } from './transfer-content';
import { StaffTransferBonusPage } from '@/components/staff/staff-transfer-bonus-page';

export default function TransferBonusPage() {
  const { user } = useAuth();

  // If user is staff, render read-only view
  if (user?.role === USER_ROLES.STAFF) {
    return <StaffTransferBonusPage />;
  }

  // Managers and company users get the same component with edit functionality
  return <TransferBonusPageContent />;
}
