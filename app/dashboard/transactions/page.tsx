'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';

import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { useTransactionsStore } from '@/stores';

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const hasInitializedRef = useRef(false);
  const setAdvancedFilters = useTransactionsStore((state) => state.setAdvancedFilters);
  const getStoreState = useTransactionsStore.getState;

  // Read agent from URL and initialize filter (only once on mount)
  useEffect(() => {
    // Only initialize once
    if (hasInitializedRef.current) {
      return;
    }

    const agentFromQuery = searchParams.get('agent');
    const agentIdFromQuery = searchParams.get('agent_id');

    const trimmedAgent = agentFromQuery?.trim() || null;
    const trimmedAgentId = agentIdFromQuery?.trim() || null;

    // If no agent params, clear all filters
    // This prevents filters from other pages (like transactions history) from being prefilled
    if (!trimmedAgent && !trimmedAgentId) {
      console.log('🔄 No agent in query, clearing all filters');
      setAdvancedFilters({});
      hasInitializedRef.current = true;
      return;
    }

    // Clear all previous filters first, then set only the agent filter
    console.log('🔄 Clearing previous filters and setting agent filter:', { agent: trimmedAgent, agent_id: trimmedAgentId });
    setAdvancedFilters({});

    // Build the filter update with only agent filters from URL
    const filterUpdate: Record<string, string> = {};

    // Update agent filters from URL
    if (trimmedAgent) {
      filterUpdate.agent = trimmedAgent;
    }

    if (trimmedAgentId) {
      filterUpdate.agent_id = trimmedAgentId;
    }

    setAdvancedFilters(filterUpdate);
    hasInitializedRef.current = true;
  }, [searchParams, setAdvancedFilters, getStoreState]);

  // Remove URL parameter after component has mounted (if agent was in URL)
  // This prevents it from overriding filter changes
  useEffect(() => {
    const agentFromQuery = searchParams.get('agent');
    const agentIdFromQuery = searchParams.get('agent_id');

    if (agentFromQuery || agentIdFromQuery) {
      // Use setTimeout to ensure state has been committed before updating URL
      const timeoutId = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete('agent');
        params.delete('agent_id');
        const newSearch = params.toString();
        const newUrl = newSearch 
          ? `${pathname}?${newSearch}`
          : pathname;
        // Use window.history.replaceState to avoid triggering a navigation/reload
        window.history.replaceState({}, '', newUrl);
        console.log('🧹 Removed agent parameters from URL to prevent override');
      }, 100); // Small delay to ensure filter state is initialized
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return <TransactionsSection />;
}

