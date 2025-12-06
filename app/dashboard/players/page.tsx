'use client';

import { useAuth } from '@/providers/auth-provider';
import PlayersDashboard from '@/components/dashboard/players/players-dashboard';
import { SuperAdminPlayersSection } from '@/components/superadmin';

export default function PlayersPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin players view
  if (user?.role === 'superadmin') {
    return <SuperAdminPlayersSection />;
  }

  return <PlayersDashboard />;
}

