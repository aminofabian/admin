'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { SignUpBonusPageContent } from './signup-content';
import { StaffSignupBonusPage } from '@/components/staff/staff-signup-bonus-page';

export default function SignUpBonusPage() {
  const { user } = useAuth();

  // If user is staff or manager, render read-only view
  if (user?.role === USER_ROLES.STAFF || user?.role === USER_ROLES.MANAGER) {
    return <StaffSignupBonusPage />;
  }

  return <SignUpBonusPageContent />;
}
