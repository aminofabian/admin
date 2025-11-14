'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { useTransactionsStore } from '@/stores';

export default function HistoryTransactionsPage() {
  const searchParams = useSearchParams();
  const { setFilter, setAdvancedFilters } = useTransactionsStore();
  const advancedFilters = useTransactionsStore((state) => state.advancedFilters);
  const appliedFiltersRef = useRef<{ username: string | null }>({
    username: null,
  });

  useEffect(() => {
    setFilter('history');
  }, [setFilter]);

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
    <>
      <HistoryTabs />
      <TransactionsSection />
    </>
  );
}
