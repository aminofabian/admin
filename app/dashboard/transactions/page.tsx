'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { useTransactionsStore } from '@/stores';

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const appliedFiltersRef = useRef<{ agent: string | null; agent_id: string | null }>({
    agent: null,
    agent_id: null,
  });
  const setAdvancedFilters = useTransactionsStore((state) => state.setAdvancedFilters);
  const getStoreState = useTransactionsStore.getState;

  useEffect(() => {
    const agentFromQuery = searchParams.get('agent');
    const agentIdFromQuery = searchParams.get('agent_id');

    const trimmedAgent = agentFromQuery?.trim() || null;
    const trimmedAgentId = agentIdFromQuery?.trim() || null;

    // Get current filters from store to avoid stale closure
    const currentAdvancedFilters = getStoreState().advancedFilters;

    console.log('📋 URL Params:', { agent: trimmedAgent, agent_id: trimmedAgentId });
    console.log('📋 Current advancedFilters:', currentAdvancedFilters);
    console.log('📋 Applied filters ref:', appliedFiltersRef.current);

    // If neither parameter is present, clear the ref and remove agent filters
    if (!trimmedAgent && !trimmedAgentId) {
      if (appliedFiltersRef.current.agent || appliedFiltersRef.current.agent_id) {
        appliedFiltersRef.current = { agent: null, agent_id: null };
        // Only clear if we're actually removing filters that were set
        if (currentAdvancedFilters.agent || currentAdvancedFilters.agent_id) {
          const { agent, agent_id, ...rest } = currentAdvancedFilters;
          console.log('🧹 Clearing agent filters from URL params');
          setAdvancedFilters(rest);
        }
      }
      return;
    }

    // Check if filters have changed
    if (
      appliedFiltersRef.current.agent === trimmedAgent &&
      appliedFiltersRef.current.agent_id === trimmedAgentId
    ) {
      console.log('⏭️ Filters unchanged, skipping update');
      return;
    }

    // Update the ref
    appliedFiltersRef.current = {
      agent: trimmedAgent,
      agent_id: trimmedAgentId,
    };

    // Build the filter update - preserve existing filters except agent/agent_id and type
    // When agent filters are set from URL, we should not preserve type filter
    // Agent filters should work with all transaction types unless explicitly filtered
    const filterUpdate: Record<string, string> = { ...currentAdvancedFilters };
    
    // Remove type filter when agent filters are set from URL
    // This ensures agent filters work with all transaction types
    delete filterUpdate.type;
    delete filterUpdate.txn;

    // Update agent filters from URL
    if (trimmedAgent) {
      filterUpdate.agent = trimmedAgent;
    } else {
      // Remove agent if not in URL (will be resolved if agent_id is present)
      delete filterUpdate.agent;
    }

    if (trimmedAgentId) {
      filterUpdate.agent_id = trimmedAgentId;
    } else {
      // Remove agent_id if not in URL (will be resolved if agent is present)
      delete filterUpdate.agent_id;
    }

    console.log(' Setting advanced filters from URL (clearing type/txn filters):', filterUpdate);
    setAdvancedFilters(filterUpdate);
  }, [searchParams, setAdvancedFilters]);

  return <TransactionsSection />;
}

