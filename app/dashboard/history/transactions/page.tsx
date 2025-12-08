'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { SuperAdminHistoryTransactions } from '@/components/superadmin';
import { useTransactionsStore } from '@/stores';

function HistoryTransactionsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setFilterWithoutFetch, setAdvancedFilters } = useTransactionsStore();
  const previousUsernameRef = useRef<string | null>(null);
  const previousAgentRef = useRef<string | null>(null);
  const previousOperatorRef = useRef<string | null>(null);

  // Set filter to 'history' for regular users
  useEffect(() => {
    if (user?.role !== 'superadmin') {
      setFilterWithoutFetch('history');
    }
  }, [setFilterWithoutFetch, user?.role]);

  // Read username from query param and update when it changes
  useEffect(() => {
    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    // Only update if username actually changed
    if (trimmedUsername !== previousUsernameRef.current) {
      if (trimmedUsername) {
        previousUsernameRef.current = trimmedUsername;

        // Remove username from URL after reading it
        const params = new URLSearchParams(window.location.search);
        params.delete('username');
        const newSearch = params.toString();
        const newUrl = newSearch
          ? `${pathname}?${newSearch}`
          : pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        previousUsernameRef.current = null;
      }
    }
  }, [searchParams, pathname]);

  // Read agent from query param and apply filter
  useEffect(() => {
    const agentFromQuery = searchParams.get('agent');
    const trimmedAgent = agentFromQuery?.trim() || null;

    // Only update if agent actually changed
    if (trimmedAgent !== previousAgentRef.current) {
      if (trimmedAgent) {
        previousAgentRef.current = trimmedAgent;
        
        // Apply agent filter (this will trigger a fetch)
        setAdvancedFilters({ agent: trimmedAgent });

        // Remove agent from URL after reading it
        const params = new URLSearchParams(window.location.search);
        params.delete('agent');
        const newSearch = params.toString();
        const newUrl = newSearch
          ? `${pathname}?${newSearch}`
          : pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        previousAgentRef.current = null;
      }
    }
  }, [searchParams, pathname, setAdvancedFilters]);

  // Read operator from query param and apply filter
  useEffect(() => {
    const operatorFromQuery = searchParams.get('operator');
    const trimmedOperator = operatorFromQuery?.trim() || null;

    // Only update if operator actually changed
    if (trimmedOperator !== previousOperatorRef.current) {
      if (trimmedOperator) {
        previousOperatorRef.current = trimmedOperator;
        
        // Apply operator filter (this will trigger a fetch)
        setAdvancedFilters({ operator: trimmedOperator });

        // Remove operator from URL after reading it
        const params = new URLSearchParams(window.location.search);
        params.delete('operator');
        const newSearch = params.toString();
        const newUrl = newSearch
          ? `${pathname}?${newSearch}`
          : pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        previousOperatorRef.current = null;
      }
    }
  }, [searchParams, pathname, setAdvancedFilters]);

  // If user is superadmin, render superadmin history view
  if (user?.role === 'superadmin') {
    return <SuperAdminHistoryTransactions />;
  }

  // For regular users, show standard transactions section
  return (
    <>
      <HistoryTabs />
      <TransactionsSection />
    </>
  );
}

export default function HistoryTransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <HistoryTransactionsContent />
    </Suspense>
  );
}
