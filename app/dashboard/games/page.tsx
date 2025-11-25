'use client';

import { useAuth } from '@/providers/auth-provider';
import { GamesSection } from '@/components/dashboard/data-sections/games-section';
import { SuperAdminGames } from '@/components/superadmin';

export default function GamesPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin games view
  if (user?.role === 'superadmin') {
    return <SuperAdminGames />;
  }

  return <GamesSection />;
}
