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

    // If no agent params, clear all filters except agent-related ones
    // This prevents filters from other pages (like transactions history) from being prefilled
    if (!trimmedAgent && !trimmedAgentId) {
      const currentAdvancedFilters = getStoreState().advancedFilters;
      // Only preserve agent filters if they exist, clear everything else
      const filterUpdate: Record<string, string> = {};
      if (currentAdvancedFilters.agent) {
        filterUpdate.agent = currentAdvancedFilters.agent;
      }
      if (currentAdvancedFilters.agent_id) {
        filterUpdate.agent_id = currentAdvancedFilters.agent_id;
      }
      // Clear all other filters (username, email, type, status, payment_method, dates, amounts, etc.)
      setAdvancedFilters(filterUpdate);
      hasInitializedRef.current = true;
      return;
    }

    // Get current filters from store
    const currentAdvancedFilters = getStoreState().advancedFilters;

    // Build the filter update - only preserve agent/agent_id from current filters
    // Clear all other filters (username, email, type, status, payment_method, dates, amounts, etc.)
    // to prevent filters from other pages from being prefilled
    const filterUpdate: Record<string, string> = {};

    // Update agent filters from URL
    if (trimmedAgent) {
      filterUpdate.agent = trimmedAgent;
    } else if (currentAdvancedFilters.agent) {
      // Preserve existing agent filter if not in URL
      filterUpdate.agent = currentAdvancedFilters.agent;
    }

    if (trimmedAgentId) {
      filterUpdate.agent_id = trimmedAgentId;
    } else if (currentAdvancedFilters.agent_id) {
      // Preserve existing agent_id filter if not in URL
      filterUpdate.agent_id = currentAdvancedFilters.agent_id;
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

