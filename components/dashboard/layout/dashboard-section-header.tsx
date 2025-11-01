'use client';

import type { ReactNode } from 'react';

interface DashboardSectionHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function DashboardSectionHeader({
  title,
  description,
  icon,
  badge,
  actions,
}: DashboardSectionHeaderProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="w-12 h-12 rounded-lg border border-border bg-muted flex items-center justify-center text-foreground">
              {icon}
            </div>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
              {badge}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex w-full justify-end sm:w-auto">{actions}</div>}
      </div>
    </div>
  );
}

