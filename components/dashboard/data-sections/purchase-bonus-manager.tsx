'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useBonusesStore } from '@/stores';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Badge,
  Button,
  Drawer,
  useToast,
} from '@/components/ui';
import { PurchaseBonusForm, ErrorState, EmptyState } from '@/components/features';
import { Skeleton } from '@/components/ui';
import { formatCurrency, formatPaymentMethod } from '@/lib/utils/formatters';
import { groupPurchaseBonusesForDisplay } from '@/lib/utils/purchase-bonuses-organize';
import type { CreatePurchaseBonusRequest, PurchaseBonus } from '@/types';

interface PurchaseBonusManagerProps {
  showHeader?: boolean;
  showStats?: boolean;
}

export function PurchaseBonusManager({ 
  showHeader = true, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showStats = true,
}: PurchaseBonusManagerProps) {
  const { 
    purchaseBonuses,
    isLoading,
    error,
    operationLoading,
    fetchPurchaseBonuses,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createPurchaseBonus,
    updatePurchaseBonus,
  } = useBonusesStore();
  const { addToast } = useToast();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBonus, setEditingBonus] = useState<PurchaseBonus | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set());

  // Initial load
  useEffect(() => {
    fetchPurchaseBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitBonus = async (data: CreatePurchaseBonusRequest & { is_enabled?: boolean }) => {
    const isEditMode = !!editingBonus;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const bonusType = editingBonus?.bonus_type || data.bonus_type;
    
    try {
      setIsSubmitting(true);
      if (editingBonus) {
        await updatePurchaseBonus(editingBonus.id, { 
          bonus: data.bonus,
          is_enabled: data.is_enabled,
        });
        addToast({
          type: 'success',
          title: 'Bonus Updated',
          description: `Bonus value has been successfully updated to ${data.bonus}.`,
        });
      }
      setIsDrawerOpen(false);
      setEditingBonus(null);
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} bonus:`, err);
      addToast({
        type: 'error',
        title: `Failed to ${isEditMode ? 'Update' : 'Create'} Bonus`,
        description: 'An error occurred while processing your request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBonus = (bonus: PurchaseBonus) => {
    setEditingBonus(bonus);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingBonus(null);
  };

  const groupedBonuses = useMemo(
    () =>
      purchaseBonuses?.results?.length
        ? groupPurchaseBonusesForDisplay(purchaseBonuses.results)
        : [],
    [purchaseBonuses?.results],
  );

  const toggleGroupExpanded = (category: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  if (isLoading || operationLoading.purchase || !purchaseBonuses) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        {showHeader && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
            <div className="p-2.5 sm:p-3 md:p-4 lg:p-6">
              <div className="relative flex items-center gap-2 sm:gap-3">
                {/* Icon Skeleton */}
                <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
                
                {/* Title Skeleton */}
                <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-40 shrink-0" />
              </div>
              
              {/* Count Skeleton */}
              <div className="mt-2 sm:mt-2.5 md:mt-3 ml-0 sm:ml-11 md:ml-12 lg:ml-14">
                <Skeleton className="h-5 sm:h-6 w-32" />
              </div>
            </div>
          </div>
        )}

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-5 gap-4 px-4 py-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !purchaseBonuses) {
    return <ErrorState message={error} onRetry={fetchPurchaseBonuses} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="p-2.5 sm:p-3 md:p-4 lg:p-6">
            <div className="relative flex items-center gap-2 sm:gap-3">
              {/* Icon */}
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              {/* Title */}
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                Purchase Bonus
              </h2>
            </div>
            
            {/* Total Bonuses Count - Below the heading */}
            <div className="mt-2 sm:mt-2.5 md:mt-3 ml-0 sm:ml-11 md:ml-12 lg:ml-14">
              <div className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {purchaseBonuses?.count || 0}
                </span>
                {' '}Total Bonuses
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Bonuses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!purchaseBonuses || purchaseBonuses.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No purchase bonuses" 
              description="Get started by creating your first purchase bonus"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Top-up method</TableHead>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Bonus Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedBonuses.map((group) => {
                  const expanded = expandedGroups.has(group.category);
                  return (
                  <Fragment key={group.category}>
                    <TableRow className="bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
                      <TableCell colSpan={5} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpanded(group.category)}
                          aria-expanded={expanded}
                          aria-label={
                            expanded
                              ? `Collapse ${group.category}, ${group.items.length} bonuses`
                              : `Expand ${group.category}, ${group.items.length} bonuses`
                          }
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200/80 dark:text-slate-100 dark:hover:bg-slate-700/60"
                        >
                          <svg
                            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${expanded ? '' : '-rotate-90'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          <span className="min-w-0 flex-1 truncate">{group.category}</span>
                          <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400 normal-case">
                            {group.items.length}
                          </span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {expanded &&
                      group.items.map((bonus) => {
                      const topupLabel = formatPaymentMethod(bonus.topup_method);

                      return (
                        <TableRow
                          key={bonus.id}
                          className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell>
                            <Badge variant="info">{topupLabel}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={bonus.bonus_type === 'percentage' ? 'success' : 'warning'}>
                              {bonus.bonus_type === 'percentage' ? 'Percentage' : 'Fixed'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                            {bonus.bonus_type === 'percentage'
                              ? `${bonus.bonus}%`
                              : formatCurrency(bonus.bonus.toString())}
                          </TableCell>
                          <TableCell>
                            <Badge variant={bonus.is_enabled ? 'success' : 'default'}>
                              {bonus.is_enabled ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBonus(bonus)}
                                disabled={operationLoading.purchase}
                                className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Bonus Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Edit Purchase Bonus"
      >
        <PurchaseBonusForm
          onSubmit={handleSubmitBonus}
          onCancel={handleCloseDrawer}
          isLoading={isSubmitting || operationLoading.purchase}
          initialData={editingBonus || undefined}
          mode="edit"
        />
      </Drawer>
    </div>
  );
}

