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
  Modal,
  useToast,
} from '@/components/ui';
import { PurchaseBonusForm, LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatCurrency } from '@/lib/utils/formatters';
import type { CreatePurchaseBonusRequest, PurchaseBonus } from '@/types';

interface PurchaseBonusManagerProps {
  showHeader?: boolean;
  showStats?: boolean;
  compact?: boolean;
}

export function PurchaseBonusManager({ 
  showHeader = true, 
  showStats = true,
  compact = false 
}: PurchaseBonusManagerProps) {
  const { 
    purchaseBonuses,
    isLoading,
    error,
    operationLoading,
    fetchPurchaseBonuses,
    createPurchaseBonus,
    updatePurchaseBonus,
  } = useBonusesStore();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBonus, setEditingBonus] = useState<PurchaseBonus | null>(null);

  // Initial load
  useEffect(() => {
    fetchPurchaseBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitBonus = async (data: CreatePurchaseBonusRequest) => {
    const isEditMode = !!editingBonus;
    const bonusType = editingBonus?.bonus_type || data.bonus_type;
    
    try {
      setIsSubmitting(true);
      if (editingBonus) {
        await updatePurchaseBonus(editingBonus.id, { bonus: data.bonus });
        addToast({
          type: 'success',
          title: 'Bonus Updated',
          description: `Bonus value has been successfully updated to ${data.bonus}${bonusType === 'percentage' ? '%' : ''}.`,
        });
      } else {
        await createPurchaseBonus(data);
        addToast({
          type: 'success',
          title: 'Bonus Created',
          description: 'Purchase bonus has been successfully created.',
        });
      }
      setIsModalOpen(false);
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
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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
      {showHeader && (
        <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchase Bonuses</h1>
                <p className="text-muted-foreground mt-1">
                  Manage bonuses for purchase transactions
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              disabled={isSubmitting || operationLoading.purchase}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Purchase Bonus
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200 group">
            <div className="absolute inset-0 opacity-[0.015]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Total Bonuses</span>
                <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground">{purchaseBonuses?.count || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">All bonus types</div>
            </div>
          </div>

          <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200 group">
            <div className="absolute inset-0 opacity-[0.015]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Percentage Bonuses</span>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-500">
                {purchaseBonuses?.results?.filter(b => b.bonus_type === 'percentage').length || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">% based rewards</div>
            </div>
          </div>

          <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200 group">
            <div className="absolute inset-0 opacity-[0.015]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Fixed Amount Bonuses</span>
                <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center border border-green-500/20">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-green-500">
                {purchaseBonuses?.results?.filter(b => b.bonus_type === 'fixed').length || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Fixed rewards</div>
            </div>
          </div>
        </div>
      )}

      {/* Bonuses Table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        {purchaseBonuses?.results.length === 0 ? (
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
                  <TableRow className="hover:bg-transparent border-border/30">
                    <TableHead className="font-semibold text-foreground">Payment Method</TableHead>
                    <TableHead className="font-semibold text-foreground">Bonus Type</TableHead>
                    <TableHead className="font-semibold text-foreground">Bonus Value</TableHead>
                    <TableHead className="font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseBonuses?.results.map((bonus) => (
                    <TableRow key={bonus.id} className="hover:bg-card/50 border-border/20 transition-colors">
                      <TableCell>
                        <Badge variant="info" className="capitalize bg-primary/10 text-primary border-primary/20">
                          {bonus.topup_method.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={bonus.bonus_type === 'percentage' ? 'success' : 'warning'}
                          className={bonus.bonus_type === 'percentage' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          }>
                          {bonus.bonus_type === 'percentage' ? 'Percentage' : 'Fixed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {bonus.bonus_type === 'percentage' 
                          ? `${bonus.bonus}%` 
                          : formatCurrency(bonus.bonus.toString())
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleEditBonus(bonus)}
                          disabled={operationLoading.purchase}
                          className="group relative bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 text-blue-600 dark:text-blue-50 border border-blue-500/30 dark:border-blue-400/30 hover:border-blue-500/50 dark:hover:border-blue-400/50 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="font-medium">Edit</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
        )}
      </section>

      {/* Create/Edit Bonus Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBonus ? 'Edit Purchase Bonus' : 'Create Purchase Bonus'}
      >
        <PurchaseBonusForm
          onSubmit={handleSubmitBonus}
          onCancel={handleCloseModal}
          isLoading={isSubmitting || operationLoading.purchase}
          initialData={editingBonus || undefined}
          mode={editingBonus ? 'edit' : 'create'}
        />
      </Modal>
    </div>
  );
}

