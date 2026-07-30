'use client';

import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { MetaCapiEventsSection } from '@/components/dashboard/data-sections/meta-capi-events-section';

export default function HistoryMetaCapiEventsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <HistoryTabs />
      <MetaCapiEventsSection />
    </div>
  );
}
