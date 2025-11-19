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
import { FirstPurchaseBonusForm, LoadingState, ErrorState, EmptyState } from '@/components/features';
import type { UpdateBonusRequest } from '@/types';

interface FirstPurchaseBonus {
  id: number;
  name: string;
  bonus_type: 'percentage';
  bonus: number;
  is_enabled: boolean;
}

export default function FirstPurchaseBonusPage() {
  const { 
    purchaseBonuses,
    isLoading,
    error,
    operationLoading,
    fetchPurchaseBonuses,
    updatePurchaseBonus,
  } = useBonusesStore();
  const { addToast } = useToast();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBonus, setEditingBonus] = useState<FirstPurchaseBonus | null>(null);

  // Filter for first purchase bonuses (assuming user = 0 or some identifier)
  // TODO: Replace with dedicated first purchase bonus API endpoint when available
  const firstPurchaseBonuses = purchaseBonuses?.results
    ?.filter((bonus) => bonus.user === 0 && bonus.bonus_type === 'percentage')
    .map((bonus) => ({
      id: bonus.id,
      name: bonus.topup_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      bonus_type: 'percentage' as const,
      bonus: bonus.bonus,
      is_enabled: bonus.is_enabled ?? true,
    })) || [];

  const firstPurchaseCount = firstPurchaseBonuses.length;

  // Initial load
  useEffect(() => {
    fetchPurchaseBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditBonus = (bonus: FirstPurchaseBonus) => {
    setEditingBonus(bonus);
    setIsDrawerOpen(true);
  };

  const handleUpdateBonus = async (data: UpdateBonusRequest) => {
    if (editingBonus) {
      try {
        setIsSubmitting(true);
        await updatePurchaseBonus(editingBonus.id, {
          bonus: data.bonus,
          is_enabled: data.is_enabled,
        });
        addToast({
          type: 'success',
          title: 'Bonus Updated',
          description: `Bonus percentage has been successfully updated to ${data.bonus}%.`,
        });
        setIsDrawerOpen(false);
        setEditingBonus(null);
      } catch (err) {
        console.error('Error updating bonus:', err);
        addToast({
          type: 'error',
          title: 'Failed to Update Bonus',
          description: 'An error occurred while processing your request. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingBonus(null);
  };

  if (isLoading && !purchaseBonuses) {
    return <LoadingState />;
  }

  if (error && !purchaseBonuses) {
    return <ErrorState message={error} onRetry={fetchPurchaseBonuses} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
              First Purchase Bonus
            </h2>
          </div>
          
          {/* Total Bonuses Count - Below the heading */}
          <div className="mt-2 sm:mt-2.5 md:mt-3 ml-0 sm:ml-11 md:ml-12 lg:ml-14">
            <div className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {firstPurchaseCount}
              </span>
              {' '}Total Bonuses
            </div>
          </div>
        </div>
      </div>

      {/* Bonuses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {firstPurchaseBonuses.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No first purchase bonuses" 
              description="No first purchase bonuses configured yet"
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firstPurchaseBonuses.map((bonus) => (
                  <TableRow key={bonus.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{bonus.name}</TableCell>
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
                        {bonus.is_enabled ? 'Active' : 'Disabled'}
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Bonus Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Edit First Purchase Bonus"
      >
        <FirstPurchaseBonusForm
          onSubmit={handleUpdateBonus}
          onCancel={handleCloseDrawer}
          isLoading={isSubmitting || operationLoading.purchase}
          initialData={editingBonus || undefined}
        />
      </Drawer>
    </div>
  );
}