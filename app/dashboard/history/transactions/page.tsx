'use client';

import { useEffect } from 'react';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { TransactionsSection } from '@/components/dashboard/data-sections/transactions-section';
import { useTransactionsStore } from '@/stores';

export default function HistoryTransactionsPage() {
  const { setFilter } = useTransactionsStore();

  useEffect(() => {
    setFilter('history');
  }, [setFilter]);

  return (
    <>
      <HistoryTabs />
      <TransactionsSection />
    </>
  );
}
