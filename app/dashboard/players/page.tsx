'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import PlayersDashboard from '@/components/dashboard/players/players-dashboard';
import { SuperAdminPlayersSection } from '@/components/superadmin';
import { StaffPlayersSection } from '@/components/staff';
import { ManagerPlayersSection } from '@/components/manager';

export default function PlayersPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin players view
  if (user?.role === USER_ROLES.SUPERADMIN) {
    return <SuperAdminPlayersSection />;
  }

  // If user is staff, render staff players view (no agent assignment)
  if (user?.role === USER_ROLES.STAFF) {
    return <StaffPlayersSection />;
  }

  // If user is manager, render manager players view (no agent assignment)
  if (user?.role === USER_ROLES.MANAGER) {
    return <ManagerPlayersSection />;
  }

  return <PlayersDashboard />;
}

