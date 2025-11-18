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

    // Clear filters that are not relevant to this page (e.g., agent/agent_id from agent transactions)
    const filtersToClear: string[] = [];
    if (currentAdvancedFilters.agent || currentAdvancedFilters.agent_id) {
      filtersToClear.push('agent', 'agent_id');
    }

    // If no username parameter, clear it if it was previously set
    if (!trimmedUsername) {
      if (appliedFiltersRef.current.username) {
        appliedFiltersRef.current = { username: null };
        if (currentAdvancedFilters.username) {
          filtersToClear.push('username');
        }
      }
      
      // Clear all irrelevant filters if any need to be cleared
      if (filtersToClear.length > 0) {
        const cleanedFilters = { ...currentAdvancedFilters };
        filtersToClear.forEach(key => delete cleanedFilters[key]);
        console.log('🧹 Clearing irrelevant filters from player transactions page:', filtersToClear);
        setAdvancedFilters(cleanedFilters);
      }
      return;
    }

    // Check if filter has changed
    if (appliedFiltersRef.current.username === trimmedUsername) {
      // Still clear agent filters even if username hasn't changed
      if (filtersToClear.length > 0) {
        const cleanedFilters = { ...currentAdvancedFilters };
        filtersToClear.forEach(key => delete cleanedFilters[key]);
        cleanedFilters.username = trimmedUsername;
        console.log('🧹 Clearing irrelevant filters while keeping username:', filtersToClear);
        setAdvancedFilters(cleanedFilters);
      }
      return;
    }

    // Update the ref
    appliedFiltersRef.current = { username: trimmedUsername };

    // Update filters - clear agent filters and set username
    const filterUpdate: Record<string, string> = {
      ...currentAdvancedFilters,
      username: trimmedUsername,
    };
    
    // Remove agent-related filters (this page is for player transactions, not agent transactions)
    delete filterUpdate.agent;
    delete filterUpdate.agent_id;

    setAdvancedFilters(filterUpdate);
  }, [searchParams, setAdvancedFilters, advancedFilters]);

  return (
    <>
      <HistoryTabs />
      <TransactionsSection />
    </>
  );
}
