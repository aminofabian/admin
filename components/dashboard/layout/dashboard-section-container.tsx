'use client';

import type { ReactNode } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';

interface DashboardSectionContainerProps {
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  loadingState?: ReactNode;
  errorState?: ReactNode;
  children: ReactNode;
}

export function DashboardSectionContainer({
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyState,
  loadingState,
  errorState,
  children,
}: DashboardSectionContainerProps) {
  if (isLoading) {
    return <>{loadingState ?? <LoadingState />}</>;
  }

  if (error) {
    return <>{errorState ?? <ErrorState message={error} onRetry={onRetry} />}</>;
  }

  if (isEmpty) {
    return <>{emptyState ?? <EmptyState title="No results found" />}</>;
  }

  return <div className="space-y-6">{children}</div>;
}

