'use client';

import { useAuth } from '@/providers/auth-provider';
import { GamesSection } from '@/components/dashboard/data-sections/games-section';
import { SuperAdminGames } from '@/components/superadmin';
import { StaffGamesSection } from '@/components/staff';

export default function GamesPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin games view
  if (user?.role === 'superadmin') {
    return <SuperAdminGames />;
  }

  // If user is staff, render read-only games view
  if (user?.role === 'staff') {
    return <StaffGamesSection />;
  }

  return <GamesSection />;
}
