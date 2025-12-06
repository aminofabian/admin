'use client';

import { useEffect, useState } from 'react';
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
import { formatCurrency } from '@/lib/utils/formatters';
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
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Bonus Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseBonuses?.results.map((bonus) => {
                  // Format payment method name consistently
                  const topupMethods = [
                    { value: 'bitcoin', label: 'Bitcoin' },
                    { value: 'creditcard', label: 'Credit Card' },
                    { value: 'paypal', label: 'PayPal' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'crypto', label: 'Cryptocurrency' },
                    { value: 'e_wallet', label: 'E-Wallet' },
                  ];
                  const paymentMethodLabel = topupMethods.find(m => m.value === bonus.topup_method)?.label 
                    || bonus.topup_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                  <TableRow key={bonus.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell>
                      <Badge variant="info" className="capitalize">
                        {paymentMethodLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bonus.bonus_type === 'percentage' ? 'success' : 'warning'}>
                        {bonus.bonus_type === 'percentage' ? 'Percentage' : 'Fixed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                      {bonus.bonus_type === 'percentage' 
                        ? `${bonus.bonus}%` 
                        : formatCurrency(bonus.bonus.toString())
                      }
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
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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

