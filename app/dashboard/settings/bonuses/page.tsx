'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { BonusSettingsSection } from '@/components/dashboard/data-sections';
import { StaffBonusesSection } from '@/components/staff';

export default function BonusSettingsPage() {
  const { user } = useAuth();

  // If user is staff, render read-only bonuses view
  if (user?.role === USER_ROLES.STAFF) {
    return (
      <div className="container mx-auto px-4 py-6">
        <StaffBonusesSection />
      </div>
    );
  }

  return (
    <BonusSettingsSection />
  );
}
