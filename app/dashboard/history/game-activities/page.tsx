'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { GameActivitiesSection } from '@/components/dashboard/data-sections/game-activities-section';
import { SuperAdminHistoryGameActivities } from '@/components/superadmin';
import { useTransactionQueuesStore } from '@/stores';

function HistoryGameActivitiesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setFilterWithoutFetch } = useTransactionQueuesStore();
  const [initialUsername, setInitialUsername] = useState<string | null>(null);
  const previousUsernameRef = useRef<string | null>(null);

  // Set filter to 'history' for regular users
  useEffect(() => {
    if (user?.role !== 'superadmin') {
      setFilterWithoutFetch('history');
    }
  }, [setFilterWithoutFetch, user?.role]);

  // Read username from query param and update when it changes
  useEffect(() => {
    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    // Only update if username actually changed
    if (trimmedUsername !== previousUsernameRef.current) {
      if (trimmedUsername) {
        setInitialUsername(trimmedUsername);
        previousUsernameRef.current = trimmedUsername;

        // Remove username from URL after reading it
        const params = new URLSearchParams(window.location.search);
        params.delete('username');
        const newSearch = params.toString();
        const newUrl = newSearch
          ? `${pathname}?${newSearch}`
          : pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        setInitialUsername(null);
        previousUsernameRef.current = null;
      }
    }
  }, [searchParams, pathname]);

  // If user is superadmin, render superadmin history view
  if (user?.role === 'superadmin') {
    return <SuperAdminHistoryGameActivities />;
  }

  // For regular users, show standard game activities section
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

export default function HistoryGameActivitiesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <HistoryGameActivitiesContent />
    </Suspense>
  );
}
