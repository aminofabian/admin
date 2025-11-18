'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameActivitiesSection } from '@/components/dashboard/data-sections/game-activities-section';
import { useTransactionQueuesStore } from '@/stores';

export default function HistoryGameActivitiesPage() {
  const searchParams = useSearchParams();
  const { setAdvancedFilters, advancedFilters } = useTransactionQueuesStore();
  const appliedFiltersRef = useRef<{ username: string | null }>({
    username: null,
  });

  useEffect(() => {
    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    // Get current filters from store
    const currentAdvancedFilters = advancedFilters;

    // If no username parameter, clear it if it was previously set
    if (!trimmedUsername) {
      if (appliedFiltersRef.current.username) {
        appliedFiltersRef.current = { username: null };
        if (currentAdvancedFilters.username) {
          const { username, ...rest } = currentAdvancedFilters;
          setAdvancedFilters(rest);
        }
      }
      return;
    }

    // Check if filter has changed
    if (appliedFiltersRef.current.username === trimmedUsername) {
      return;
    }

    // Update the ref
    appliedFiltersRef.current = { username: trimmedUsername };

    // Update filters
    const filterUpdate: Record<string, string> = {
      ...currentAdvancedFilters,
      username: trimmedUsername,
    };

    setAdvancedFilters(filterUpdate);
  }, [searchParams, setAdvancedFilters, advancedFilters]);

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <GameActivitiesSection showTabs={true} />
    </div>
  );
}
