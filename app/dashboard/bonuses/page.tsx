'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { BonusesSection } from '@/components/dashboard/data-sections/bonuses-section';
import { StaffBonusesSection } from '@/components/staff';
import { ManagerBonusesSection } from '@/components/manager';

export default function BonusesPage() {
  const { user } = useAuth();

  // If user is staff, render read-only bonuses view
  if (user?.role === USER_ROLES.STAFF) {
    return (
      <div className="container mx-auto px-4 py-6">
        <StaffBonusesSection />
      </div>
    );
  }

  // If user is manager, render read-only bonuses view
  if (user?.role === USER_ROLES.MANAGER) {
    return (
      <div className="container mx-auto px-4 py-6">
        <ManagerBonusesSection />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <BonusesSection />
    </div>
  );
}

