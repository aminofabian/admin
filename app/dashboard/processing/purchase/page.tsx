'use client';

import { ProcessingSection } from '@/components/dashboard/data-sections';
import { ProcessingTabs } from '@/components/dashboard/layout';

export default function PurchasePage() {
  return (
    <>
      <ProcessingTabs />
      <ProcessingSection type="purchases" />
    </>
  );
}

