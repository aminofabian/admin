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
  const hasReadQueryParamRef = useRef(false);

  useEffect(() => {
    setFilterWithoutFetch('history');
  }, [setFilterWithoutFetch]);

  // Read username from query param once and pass to section component
  useEffect(() => {
    if (hasReadQueryParamRef.current) {
      return;
    }

    const usernameFromQuery = searchParams.get('username');
    const trimmedUsername = usernameFromQuery?.trim() || null;

    if (trimmedUsername) {
      setInitialUsername(trimmedUsername);
      // Remove username from URL after reading it
      const params = new URLSearchParams(window.location.search);
      params.delete('username');
      const newSearch = params.toString();
      const newUrl = newSearch 
        ? `${pathname}?${newSearch}`
        : pathname;
      window.history.replaceState({}, '', newUrl);
    }

    hasReadQueryParamRef.current = true;
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
