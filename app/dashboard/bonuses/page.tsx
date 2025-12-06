'use client';

import { useAuth } from '@/providers/auth-provider';
import { BonusesSection } from '@/components/dashboard/data-sections/bonuses-section';
import { StaffBonusesSection } from '@/components/staff';

export default function BonusesPage() {
  const { user } = useAuth();

  // If user is staff, render read-only bonuses view
  if (user?.role === 'staff') {
    return (
      <div className="container mx-auto px-4 py-6">
        <StaffBonusesSection />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <BonusesSection />
    </div>
  );
}

