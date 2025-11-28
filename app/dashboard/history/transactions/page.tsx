'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { SuperAdminHistoryTransactions } from '@/components/superadmin';
import { useTransactionsStore } from '@/stores';

export default function HistoryTransactionsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setFilterWithoutFetch } = useTransactionsStore();
  const [initialUsername, setInitialUsername] = useState<string | null>(null);
  const previousUsernameRef = useRef<string | null>(null);

  useEffect(() => {
    setFilterWithoutFetch('history');
  }, [setFilterWithoutFetch]);

  // Read username from query param and update when it changes
  useEffect(() => {
    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    // Only update if username actually changed
    if (trimmedUsername !== previousUsernameRef.current) {
      if (trimmedUsername) {
        setInitialUsername(trimmedUsername);
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
        setInitialUsername(null);
        previousUsernameRef.current = null;
      }
    }
  }, [searchParams, pathname]);

  // If user is superadmin, render superadmin history view
  if (user?.role === 'superadmin') {
    return <SuperAdminHistoryTransactions />;
  }

  return (
    <>
      <HistoryTabs />
      <TransactionsSection 
        initialUsername={initialUsername}
        openFiltersOnMount={!!initialUsername}
      />
    </>
  );
}
