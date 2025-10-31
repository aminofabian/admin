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
  Button,
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import type { SignupBonus } from '@/types';
import { formatCurrency } from '@/lib/utils/formatters';

export default function SignUpBonusPage() {
  const { 
    signupBonuses,
    isLoading,
    error,
    operationLoading,
    fetchSignupBonuses,
  } = useBonusesStore();

  // Initial load
  useEffect(() => {
    fetchSignupBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditBonus = (bonus: SignupBonus) => {
    console.log('Edit bonus:', bonus);
  };

  if (isLoading && !signupBonuses) {
    return <LoadingState />;
  }

  if (error && !signupBonuses) {
    return <ErrorState message={error} onRetry={fetchSignupBonuses} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sign Up Bonuses</h1>
          <p className="text-muted-foreground mt-1">
            Manage bonuses for new user registrations
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
            {signupBonuses?.results?.filter(b => b.is_enabled).length || 0}
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
            {signupBonuses?.results?.filter(b => !b.is_enabled).length || 0}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Configurations</span>
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{signupBonuses?.count || 0}</div>
        </div>
      </div>

      {/* Bonuses Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {signupBonuses?.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No sign up bonuses" 
              description="No new user registration bonuses configured yet"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Bonus Value</TableHead>
                  <TableHead>Min Deposit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signupBonuses?.results.map((bonus) => (
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
                        disabled={operationLoading.signup}
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
