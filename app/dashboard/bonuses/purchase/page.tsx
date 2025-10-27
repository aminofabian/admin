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
} from '@/components/ui';
import { PurchaseBonusForm, LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatCurrency } from '@/lib/utils/formatters';
import type { CreatePurchaseBonusRequest, PurchaseBonus } from '@/types';

export default function PurchaseBonusPage() {
  const { 
    purchaseBonuses,
    isLoading,
    error,
    operationLoading,
    fetchPurchaseBonuses,
    createPurchaseBonus,
    deletePurchaseBonus,
  } = useBonusesStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial load
  useEffect(() => {
    fetchPurchaseBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateBonus = async (data: CreatePurchaseBonusRequest) => {
    try {
      setIsSubmitting(true);
      await createPurchaseBonus(data);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating bonus:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBonus = async (id: number) => {
    if (confirm('Are you sure you want to delete this bonus?')) {
      try {
        await deletePurchaseBonus(id);
      } catch (err) {
        console.error('Error deleting bonus:', err);
      }
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Bonuses</h1>
          <p className="text-muted-foreground mt-1">
            Manage bonuses for purchase transactions
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          disabled={isSubmitting || operationLoading.purchase}
        >
          + Add Purchase Bonus
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Bonuses</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{purchaseBonuses?.count || 0}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Percentage Bonuses</span>
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {purchaseBonuses?.results?.filter(b => b.bonus_type === 'percentage').length || 0}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Fixed Amount Bonuses</span>
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {purchaseBonuses?.results?.filter(b => b.bonus_type === 'fixed').length || 0}
          </div>
        </div>
      </div>

      {/* Bonuses Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
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
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Bonus Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseBonuses?.results.map((bonus) => (
                  <TableRow key={bonus.id}>
                    <TableCell className="font-medium">{bonus.user}</TableCell>
                    <TableCell>
                      <Badge variant="info" className="capitalize">{bonus.topup_method.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bonus.bonus_type === 'percentage' ? 'success' : 'warning'}>
                        {bonus.bonus_type === 'percentage' ? 'Percentage' : 'Fixed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      {bonus.bonus_type === 'percentage' 
                        ? `${bonus.bonus}%` 
                        : formatCurrency(bonus.bonus.toString())
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteBonus(bonus.id)}
                        disabled={operationLoading.purchase}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Bonus Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Purchase Bonus"
      >
        <PurchaseBonusForm
          onSubmit={handleCreateBonus}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isSubmitting || operationLoading.purchase}
        />
      </Modal>
    </div>
  );
}
