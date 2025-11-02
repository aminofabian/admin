'use client';

import { ProcessingSection } from '@/components/dashboard/data-sections';
import { ProcessingTabs } from '@/components/dashboard/layout';

export default function CashoutPage() {
  return (
    <>
      <ProcessingTabs />
      <ProcessingSection type="cashouts" />
    </>
  );
}

