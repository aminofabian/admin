'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyticsPage() {
  const router = useRouter();
  
  // Redirect to transactions page
  useEffect(() => {
    router.replace('/dashboard/analytics/transactions');
  }, [router]);

  return null;
}
