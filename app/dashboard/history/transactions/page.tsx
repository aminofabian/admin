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
  const { setFilterWithoutFetch } = useTransactionsStore();
  const previousUsernameRef = useRef<string | null>(null);

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
