'use client';

import { ProcessingSection } from '@/components/dashboard/data-sections';

export default function GameActivitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Game Activities Processing</h1>
        <p className="text-muted-foreground mt-2">
          Manage game recharge, redeem, and user addition activities
        </p>
      </div>
      
      <ProcessingSection type="game_activities" />
    </div>
  );
}

