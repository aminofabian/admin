'use client';

import { ProcessingSection } from '@/components/dashboard/data-sections';

export default function CashoutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cashout Processing</h1>
        <p className="text-muted-foreground mt-2">
          Manage and process cashout transactions
        </p>
      </div>
      
      <ProcessingSection type="cashouts" />
    </div>
  );
}

