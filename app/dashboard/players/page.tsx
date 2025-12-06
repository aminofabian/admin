'use client';

import { useAuth } from '@/providers/auth-provider';
import PlayersDashboard from '@/components/dashboard/players/players-dashboard';
import { SuperAdminPlayersSection } from '@/components/superadmin';
import { StaffPlayersSection } from '@/components/staff';

export default function PlayersPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin players view
  if (user?.role === 'superadmin') {
    return <SuperAdminPlayersSection />;
  }

  // If user is staff, render staff players view (no agent assignment)
  if (user?.role === 'staff') {
    return <StaffPlayersSection />;
  }

  return <PlayersDashboard />;
}

