'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { GameActivitiesSection } from '@/components/dashboard/data-sections/game-activities-section';
import { SuperAdminHistoryGameActivities } from '@/components/superadmin';
import { useTransactionQueuesStore } from '@/stores';

export default function HistoryGameActivitiesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setFilterWithoutFetch } = useTransactionQueuesStore();
  const [initialUsername, setInitialUsername] = useState<string | null>(null);
  const hasReadQueryParamRef = useRef(false);

  useEffect(() => {
    setFilterWithoutFetch('history');
  }, [setFilterWithoutFetch]);

  // Read username from query param and pass to section component
  useEffect(() => {
    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    if (trimmedUsername) {
      setInitialUsername(trimmedUsername);
      // Remove username from URL after reading it
      const params = new URLSearchParams(window.location.search);
      params.delete('username');
      const newSearch = params.toString();
      const newUrl = newSearch 
        ? `${pathname}?${newSearch}`
        : pathname;
      window.history.replaceState({}, '', newUrl);
    } else {
      // Clear initial username if no query param
      setInitialUsername(null);
    }
  }, [searchParams, pathname]);

  // If user is superadmin, render superadmin history view
  if (user?.role === 'superadmin') {
    return <SuperAdminHistoryGameActivities />;
  }

  return (
    <>
      <HistoryTabs />
      <GameActivitiesSection 
        showTabs={false} 
        initialUsername={initialUsername}
        openFiltersOnMount={!!initialUsername}
      />
    </>
  );
}
