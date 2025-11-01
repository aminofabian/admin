'use client';

import type { ReactNode } from 'react';

type StatVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const VARIANT_STYLES: Record<StatVariant, string> = {
  default: 'bg-muted text-foreground',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  info: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

interface DashboardStatCardProps {
  title: string;
  value: string;
  icon?: ReactNode;
  helperText?: string;
  variant?: StatVariant;
}

export function DashboardStatCard({
  title,
  value,
  icon,
  helperText,
  variant = 'default',
}: DashboardStatCardProps) {
  const badgeClasses = VARIANT_STYLES[variant];

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <div className="text-2xl font-semibold text-foreground sm:text-3xl">{value}</div>
          {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
        </div>
        {icon && <div className={`flex h-10 w-10 items-center justify-center rounded-full ${badgeClasses}`}>{icon}</div>}
      </div>
    </div>
  );
}

