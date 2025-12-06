'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { GamesSection } from '@/components/dashboard/data-sections/games-section';
import { SuperAdminGames } from '@/components/superadmin';
import { StaffGamesSection } from '@/components/staff';
import { ManagerGamesSection } from '@/components/manager';

export default function GamesPage() {
  const { user } = useAuth();

  // If user is superadmin, render superadmin games view
  if (user?.role === USER_ROLES.SUPERADMIN) {
    return <SuperAdminGames />;
  }

  // If user is staff, render read-only games view
  if (user?.role === USER_ROLES.STAFF) {
    return <StaffGamesSection />;
  }

  // If user is manager, render read-only games view
  if (user?.role === USER_ROLES.MANAGER) {
    return <ManagerGamesSection />;
  }

  return <GamesSection />;
}
