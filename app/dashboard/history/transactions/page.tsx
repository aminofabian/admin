'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { useTransactionsStore } from '@/stores';

export default function HistoryTransactionsPage() {
  const searchParams = useSearchParams();
  const { setFilterWithoutFetch, setAdvancedFiltersWithoutFetch, clearAdvancedFilters } = useTransactionsStore();
  const advancedFilters = useTransactionsStore((state) => state.advancedFilters);
  const hasInitializedRef = useRef(false);
  const appliedFiltersRef = useRef<{ username: string | null }>({
    username: null,
  });

  useEffect(() => {
    setFilterWithoutFetch('history');
  }, [setFilterWithoutFetch]);

  // Reset all filters when revisiting the page (unless there's a username query param)
  useEffect(() => {
    // Only reset on initial mount, not on every render
    if (hasInitializedRef.current) {
      return;
    }

    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    // If no username parameter, reset all filters to default state
    if (!trimmedUsername) {
      console.log('🔄 Resetting all filters on Transaction History page visit');
      clearAdvancedFilters();
      hasInitializedRef.current = true;
      return;
    }

    // If username is provided, set it and clear other filters
    const filterUpdate: Record<string, string> = {
      username: trimmedUsername,
    };
    
    setAdvancedFiltersWithoutFetch(filterUpdate);
    appliedFiltersRef.current = { username: trimmedUsername };
    hasInitializedRef.current = true;
  }, [searchParams, setAdvancedFiltersWithoutFetch, clearAdvancedFilters]);

  // Handle username query param changes after initial mount
  useEffect(() => {
    // Skip if not initialized yet (handled by the first useEffect)
    if (!hasInitializedRef.current) {
      return;
    }

    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    // If username was removed from query, reset all filters
    if (!trimmedUsername && appliedFiltersRef.current.username) {
      console.log('🔄 Username removed from query, resetting all filters');
      clearAdvancedFilters();
      appliedFiltersRef.current = { username: null };
      return;
    }

    // If username changed, update it
    if (trimmedUsername && appliedFiltersRef.current.username !== trimmedUsername) {
      const filterUpdate: Record<string, string> = {
        username: trimmedUsername,
      };
      setAdvancedFiltersWithoutFetch(filterUpdate);
      appliedFiltersRef.current = { username: trimmedUsername };
    }
  }, [searchParams, setAdvancedFiltersWithoutFetch, clearAdvancedFilters]);

  return (
    <>
      <HistoryTabs />
      <TransactionsSection />
    </>
  );
}
