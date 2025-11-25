'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { SuperAdminHistoryTransactions } from '@/components/superadmin';
import { useTransactionsStore } from '@/stores';

export default function HistoryTransactionsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { setFilterWithoutFetch, setAdvancedFiltersWithoutFetch, clearAdvancedFiltersWithoutFetch } = useTransactionsStore();
  const advancedFilters = useTransactionsStore((state) => state.advancedFilters);
  const hasInitializedRef = useRef(false);
  const appliedFiltersRef = useRef<{ username: string | null }>({
    username: null,
  });

  // If user is superadmin, render superadmin history view
  if (user?.role === 'superadmin') {
    return <SuperAdminHistoryTransactions />;
  }

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
      clearAdvancedFiltersWithoutFetch();
      hasInitializedRef.current = true;
      return;
    }

    // If username is provided, clear all filters first, then set only the username filter
    console.log('🔄 Clearing previous filters and setting username filter:', trimmedUsername);
    clearAdvancedFiltersWithoutFetch();
    const filterUpdate: Record<string, string> = {
      username: trimmedUsername,
    };

    setAdvancedFiltersWithoutFetch(filterUpdate);
    appliedFiltersRef.current = { username: trimmedUsername };
    hasInitializedRef.current = true;
  }, [searchParams, setAdvancedFiltersWithoutFetch, clearAdvancedFiltersWithoutFetch]);

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
      clearAdvancedFiltersWithoutFetch();
      appliedFiltersRef.current = { username: null };
      return;
    }

    // If username changed, clear all filters first, then set only the username filter
    if (trimmedUsername && appliedFiltersRef.current.username !== trimmedUsername) {
      console.log('🔄 Username changed, clearing previous filters and setting new username filter:', trimmedUsername);
      clearAdvancedFiltersWithoutFetch();
      const filterUpdate: Record<string, string> = {
        username: trimmedUsername,
      };
      setAdvancedFiltersWithoutFetch(filterUpdate);
      appliedFiltersRef.current = { username: trimmedUsername };
    }
  }, [searchParams, setAdvancedFiltersWithoutFetch, clearAdvancedFiltersWithoutFetch]);

  return (
    <>
      <HistoryTabs />
      <TransactionsSection />
    </>
  );
}
