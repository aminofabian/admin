'use client';

import { ProcessingSection } from '@/components/dashboard/data-sections';

export default function PurchasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Purchase Processing</h1>
        <p className="text-muted-foreground mt-2">
          Manage and process purchase transactions
        </p>
      </div>
      
      <ProcessingSection type="purchases" />
    </div>
  );
}

