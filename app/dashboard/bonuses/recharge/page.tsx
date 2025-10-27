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
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import type { RechargeBonus, UpdateBonusRequest } from '@/types';
import { formatCurrency } from '@/lib/utils/formatters';

export default function RechargeBonusPage() {
  const { 
    rechargeBonuses,
    isLoading,
    error,
    operationLoading,
    fetchRechargeBonuses,
    updateRechargeBonus,
  } = useBonusesStore();

  const [selectedBonus, setSelectedBonus] = useState<RechargeBonus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initial load
  useEffect(() => {
    fetchRechargeBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditBonus = (bonus: RechargeBonus) => {
    setSelectedBonus(bonus);
    setIsModalOpen(true);
  };

  const handleUpdateBonus = async (data: UpdateBonusRequest) => {
    if (selectedBonus) {
      try {
        await updateRechargeBonus(selectedBonus.id, data);
        setIsModalOpen(false);
        setSelectedBonus(null);
      } catch (err) {
        console.error('Error updating bonus:', err);
      }
    }
  };

  if (isLoading && !rechargeBonuses) {
    return <LoadingState />;
  }

  if (error && !rechargeBonuses) {
    return <ErrorState message={error} onRetry={fetchRechargeBonuses} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recharge Bonuses</h1>
          <p className="text-muted-foreground mt-1">
            Manage bonuses for game recharge transactions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Active Bonuses</span>
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {rechargeBonuses?.results?.filter(b => b.is_enabled).length || 0}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Disabled Bonuses</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-muted-foreground">
            {rechargeBonuses?.results?.filter(b => !b.is_enabled).length || 0}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Games</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{rechargeBonuses?.count || 0}</div>
        </div>
      </div>

      {/* Bonuses Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {rechargeBonuses?.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No recharge bonuses" 
              description="No game recharge bonuses configured yet"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game Name</TableHead>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Bonus Value</TableHead>
                  <TableHead>Min Deposit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rechargeBonuses?.results.map((bonus) => (
                  <TableRow key={bonus.id}>
                    <TableCell className="font-medium">{bonus.name}</TableCell>
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
                      {bonus.on_min_deposit && bonus.min_deposit_amount ? (
                        <span className="text-sm">{formatCurrency(bonus.min_deposit_amount.toString())}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bonus.is_enabled ? 'success' : 'default'}>
                        {bonus.is_enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEditBonus(bonus)}
                        disabled={operationLoading.recharge}
                      >
                        Edit
                      </Button>
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
