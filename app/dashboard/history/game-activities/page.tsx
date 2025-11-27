'use client';

import { useEffect, useRef } from 'react';
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
  const { setAdvancedFiltersWithoutFetch } = useTransactionQueuesStore();
  const appliedFiltersRef = useRef<{ username: string | null }>({
    username: null,
  });
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    // If no username parameter, clear all filters if it was previously set
    if (!trimmedUsername) {
      if (appliedFiltersRef.current.username || hasInitializedRef.current) {
        console.log('🔄 No username in query, clearing all filters');
        setAdvancedFiltersWithoutFetch({});
        appliedFiltersRef.current = { username: null };
        hasInitializedRef.current = true;
      }
      return;
    }

    // Check if filter has changed
    if (appliedFiltersRef.current.username === trimmedUsername && hasInitializedRef.current) {
      return;
    }

    // Clear all previous filters first, then set only the username filter
    console.log('🔄 Clearing previous filters and setting username filter:', trimmedUsername);
    setAdvancedFiltersWithoutFetch({});

    // Update the ref
    appliedFiltersRef.current = { username: trimmedUsername };
    hasInitializedRef.current = true;

    // Set only the username filter
    const filterUpdate: Record<string, string> = {
      username: trimmedUsername,
    };

    setAdvancedFiltersWithoutFetch(filterUpdate);
  }, [searchParams, setAdvancedFiltersWithoutFetch]);

  // Remove username query param from URL after it's been read and applied to filters
  // This prevents the URL from showing query params after they've been applied
  useEffect(() => {
    const usernameFromQuery = searchParams.get('username');

    if (usernameFromQuery) {
      // Use setTimeout to ensure state has been committed before updating URL
      const timeoutId = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete('username');
        const newSearch = params.toString();
        const newUrl = newSearch 
          ? `${pathname}?${newSearch}`
          : pathname;
        // Use window.history.replaceState to avoid triggering a navigation/reload
        window.history.replaceState({}, '', newUrl);
        console.log('🧹 Removed username parameter from URL to prevent override');
      }, 100); // Small delay to ensure filter state is initialized
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // If user is superadmin, render superadmin history view
  if (user?.role === 'superadmin') {
    return <SuperAdminHistoryGameActivities />;
  }

  return (
    <>
      <HistoryTabs />
      <GameActivitiesSection showTabs={false} />
    </>
  );
}
