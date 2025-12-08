'use client';

import { useEffect } from 'react';
import { useBonusesStore } from '@/stores';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Badge,
} from '@/components/ui';
import { ErrorState, EmptyState } from '@/components/features';
import { Skeleton } from '@/components/ui';

export function StaffTransferBonusPage() {
  const { 
    transferBonuses,
    isLoading,
    error,
    operationLoading,
    fetchTransferBonuses,
  } = useBonusesStore();

  // Initial load
  useEffect(() => {
    fetchTransferBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || operationLoading.transfer || !transferBonuses) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="p-2.5 sm:p-3 md:p-4 lg:p-6">
            <div className="relative flex items-center gap-2 sm:gap-3">
              <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
              <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-40 shrink-0" />
            </div>
            <div className="mt-2 sm:mt-2.5 md:mt-3 ml-0 sm:ml-11 md:ml-12 lg:ml-14">
              <Skeleton className="h-5 sm:h-6 w-32" />
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-4 gap-4 px-4 py-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 px-4 py-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !transferBonuses) {
    return <ErrorState message={error} onRetry={fetchTransferBonuses} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="p-2.5 sm:p-3 md:p-4 lg:p-6">
          <div className="relative flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
              Transfer Bonus
            </h2>
          </div>
          <div className="mt-2 sm:mt-2.5 md:mt-3 ml-0 sm:ml-11 md:ml-12 lg:ml-14">
            <div className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {transferBonuses?.count || 0}
              </span>
              {' '}Total Bonuses
            </div>
          </div>
        </div>
      </div>

      {/* Bonuses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!transferBonuses || transferBonuses.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No transfer bonuses" 
              description="No balance transfer bonuses configured yet"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bonus Name</TableHead>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Bonus Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferBonuses?.results.map((bonus) => (
                  <TableRow key={bonus.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{bonus.name || 'Transfer Bonus'}</TableCell>
                    <TableCell>
                      <Badge variant="success">
                        Percentage
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                      {bonus.bonus}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={bonus.is_enabled ? 'success' : 'default'}>
                        {bonus.is_enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

