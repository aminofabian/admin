'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameActivitiesSection } from '@/components/dashboard/data-sections/game-activities-section';
import { useTransactionQueuesStore } from '@/stores';

export default function HistoryGameActivitiesPage() {
  const searchParams = useSearchParams();
  const { setAdvancedFilters, advancedFilters } = useTransactionQueuesStore();
  const appliedFiltersRef = useRef<{ user_id: string | null }>({
    user_id: null,
  });

  useEffect(() => {
    const userIdFromQuery = searchParams.get('user_id');
    const trimmedUserId = userIdFromQuery?.trim() || null;

    // If no user_id parameter, clear it if it was previously set
    if (!trimmedUserId) {
      if (appliedFiltersRef.current.user_id) {
        appliedFiltersRef.current = { user_id: null };
        if (advancedFilters.user_id) {
          const { user_id, ...rest } = advancedFilters;
          setAdvancedFilters(rest);
        }
      }
      return;
    }

    // Check if filter has changed
    if (appliedFiltersRef.current.user_id === trimmedUserId) {
      return;
    }

    // Update the ref
    appliedFiltersRef.current = { user_id: trimmedUserId };

    // Update filters
    const filterUpdate: Record<string, string> = {
      ...advancedFilters,
      user_id: trimmedUserId,
    };

    setAdvancedFilters(filterUpdate);
  }, [searchParams, setAdvancedFilters, advancedFilters]);

  return <GameActivitiesSection showTabs={true} />;
}
