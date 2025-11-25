'use client';

import { useAuth } from '@/providers/auth-provider';
import { PaymentSettingsSection } from '@/components/dashboard/data-sections';
import { SuperAdminPaymentSettings } from '@/components/superadmin';

export default function PaymentSettingsPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin payment settings view
  if (user?.role === 'superadmin') {
    return <SuperAdminPaymentSettings />;
  }

  return (
    <PaymentSettingsSection />
  );
}
