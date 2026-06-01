'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { PaymentSettingsSection } from '@/components/dashboard/data-sections';
import { SuperAdminPaymentSettings } from '@/components/superadmin';

export default function PaymentSettingsPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin payment settings view
  if (user?.role === USER_ROLES.SUPERADMIN) {
    return <SuperAdminPaymentSettings />;
  }

  // Staff: same categorized UI as admin/company/manager, read-only
  if (user?.role === USER_ROLES.STAFF) {
    return <PaymentSettingsSection readOnly />;
  }

  // Company admin, manager, and other roles with access use the shared categorized UI
  return <PaymentSettingsSection />;
}
