'use client';

import { ProcessingSection } from '@/components/dashboard/data-sections';
import { ProcessingTabs } from '@/components/dashboard/layout';

export default function GameActivitiesPage() {
  return (
    <>
      <ProcessingTabs />
      <ProcessingSection type="game_activities" />
    </>
  );
}

