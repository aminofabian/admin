'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { PaymentSettingsSection } from '@/components/dashboard/data-sections';
import { SuperAdminPaymentSettings } from '@/components/superadmin';
import { StaffPaymentSettingsSection } from '@/components/staff';
import { ManagerPaymentSettingsSection } from '@/components/manager';

export default function PaymentSettingsPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin payment settings view
  if (user?.role === USER_ROLES.SUPERADMIN) {
    return <SuperAdminPaymentSettings />;
  }

  // If user is staff, render read-only payment settings view
  if (user?.role === USER_ROLES.STAFF) {
    return (
      <div className="container mx-auto px-4 py-6">
        <StaffPaymentSettingsSection />
      </div>
    );
  }

  // If user is manager, render manager payment settings view (same capabilities as admin)
  if (user?.role === USER_ROLES.MANAGER) {
    return (
      <div className="container mx-auto px-4 py-6">
        <ManagerPaymentSettingsSection />
      </div>
    );
  }

  return (
    <PaymentSettingsSection />
  );
}
