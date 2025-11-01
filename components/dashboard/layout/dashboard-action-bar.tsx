'use client';

import type { ReactNode } from 'react';

interface DashboardActionBarProps {
  children: ReactNode;
}

export function DashboardActionBar({ children }: DashboardActionBarProps) {
  return <div className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-3">{children}</div>;
}

