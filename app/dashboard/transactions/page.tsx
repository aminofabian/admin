'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { useTransactionsStore } from '@/stores';

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const appliedAgentRef = useRef<string | null>(null);
  const advancedFilters = useTransactionsStore((state) => state.advancedFilters);
  const setAdvancedFilters = useTransactionsStore((state) => state.setAdvancedFilters);

  useEffect(() => {
    const agentFromQuery = searchParams.get('agent');

    if (!agentFromQuery) {
      appliedAgentRef.current = null;
      return;
    }

    const trimmedAgent = agentFromQuery.trim();

    if (trimmedAgent.length === 0) {
      return;
    }

    if (appliedAgentRef.current === trimmedAgent) {
      return;
    }

    appliedAgentRef.current = trimmedAgent;

    setAdvancedFilters({
      ...advancedFilters,
      agent: trimmedAgent,
    });
  }, [advancedFilters, searchParams, setAdvancedFilters]);

  return <TransactionsSection />;
}

