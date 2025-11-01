'use client';

import type { ReactNode } from 'react';

interface DashboardStatGridProps {
  children: ReactNode;
}

export function DashboardStatGrid({ children }: DashboardStatGridProps) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

