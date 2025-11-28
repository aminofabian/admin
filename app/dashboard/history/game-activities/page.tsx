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
  const { setFilterWithoutFetch, setAdvancedFiltersWithoutFetch, reset } = useTransactionQueuesStore();
  const [initialUsername, setInitialUsername] = useState<string | null>(null);
  const previousUsernameRef = useRef<string | null>(null);

  useEffect(() => {
    setFilterWithoutFetch('history');
  }, [setFilterWithoutFetch]);

  // Read username from query param and pass to section component
  useEffect(() => {
    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    // Remove username from URL IMMEDIATELY (synchronously) to prevent it from showing in URL
    if (usernameFromQuery) {
      const params = new URLSearchParams(window.location.search);
      params.delete('username');
      const newSearch = params.toString();
      const newUrl = newSearch 
        ? `${pathname}?${newSearch}`
        : pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // If username changed, completely reset store to prevent stale requests
    if (trimmedUsername && previousUsernameRef.current !== trimmedUsername) {
      console.log('🧹 Resetting store for new username:', {
        newUsername: trimmedUsername,
        previousUsername: previousUsernameRef.current,
      });
      
      // CRITICAL: Reset the entire store to clear all state including old username
      // This ensures no stale data persists
      reset();
      
      // Set filter to history after reset
      setFilterWithoutFetch('history');
      
      // Clear all filters explicitly (redundant but safe)
      setAdvancedFiltersWithoutFetch({});
      
      // Wait a moment for reset to complete, then set new username
      setTimeout(() => {
        setInitialUsername(trimmedUsername);
        previousUsernameRef.current = trimmedUsername;
      }, 0);
    } else if (!trimmedUsername && previousUsernameRef.current !== null) {
      // Clear filters if username was removed
      console.log('🧹 Clearing filters - no username in query');
      setAdvancedFiltersWithoutFetch({});
      setInitialUsername(null);
      previousUsernameRef.current = null;
    } else if (trimmedUsername && previousUsernameRef.current === trimmedUsername) {
      // Same username, just ensure it's set
      setInitialUsername(trimmedUsername);
    } else {
      // No username
      setInitialUsername(null);
    }
  }, [searchParams, pathname, setAdvancedFiltersWithoutFetch, setFilterWithoutFetch, reset]);

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
  const { user } = useAuth();

  // If user is superadmin, render superadmin history view
  if (user?.role === 'superadmin') {
    return <SuperAdminHistoryGameActivities />;
  }

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
