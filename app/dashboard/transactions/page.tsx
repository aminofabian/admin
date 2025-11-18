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

    // If no agent params, just clear username filter if present
    if (!trimmedAgent && !trimmedAgentId) {
      const currentAdvancedFilters = getStoreState().advancedFilters;
      if (currentAdvancedFilters.username) {
        const cleanedFilters = { ...currentAdvancedFilters };
        delete cleanedFilters.username;
        setAdvancedFilters(cleanedFilters);
      }
      hasInitializedRef.current = true;
      return;
    }

    // Get current filters from store
    const currentAdvancedFilters = getStoreState().advancedFilters;

    // Build the filter update - preserve existing filters except agent/agent_id, type, and username
    // When agent filters are set from URL, we should not preserve type filter or username filter
    // Agent filters should work with all transaction types unless explicitly filtered
    const filterUpdate: Record<string, string> = { ...currentAdvancedFilters };
    
    // Remove type filter when agent filters are set from URL
    // This ensures agent filters work with all transaction types
    delete filterUpdate.type;
    delete filterUpdate.txn;
    // Remove username filter (this page is for agent transactions, not player transactions)
    delete filterUpdate.username;

    // Update agent filters from URL
    if (trimmedAgent) {
      filterUpdate.agent = trimmedAgent;
    } else {
      delete filterUpdate.agent;
    }

    if (trimmedAgentId) {
      filterUpdate.agent_id = trimmedAgentId;
    } else {
      delete filterUpdate.agent_id;
    }

    console.log('✅ Initializing agent filter from URL:', { agent: trimmedAgent, agent_id: trimmedAgentId });
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

