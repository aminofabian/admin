'use client';

import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { RouletteRewardsSection } from '@/components/dashboard/data-sections/roulette-rewards-section';

export default function HistoryRouletteRewardsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <HistoryTabs />
      <RouletteRewardsSection />
    </div>
  );
}
