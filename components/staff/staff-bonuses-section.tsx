'use client';

import { useEffect, useState } from 'react';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Badge, Skeleton } from '@/components/ui';
import { ErrorState, EmptyState } from '@/components/features';
import { useBonusesStore } from '@/stores/use-bonuses-store';
import { formatCurrency } from '@/lib/utils/formatters';
import type { PurchaseBonusSettings, RechargeBonusSettings, TransferBonusSettings, SignupBonusSettings, FirstPurchaseBonus } from '@/types';

type BonusItem = PurchaseBonusSettings | RechargeBonusSettings | TransferBonusSettings | SignupBonusSettings;
type AllItems = BonusItem | FirstPurchaseBonus;

const getBonusDisplayName = (item: AllItems) => {
  const record = item as unknown as Record<string, unknown>;
  const name = record.name;
  if (typeof name === 'string' && name.trim()) {
    return name;
  }
  const displayText = record.display_text;
  if (typeof displayText === 'string' && displayText.trim()) {
    return displayText;
  }
  const bonusName = record.bonus_name;
  if (typeof bonusName === 'string' && bonusName.trim()) {
    return bonusName;
  }
  return `Bonus ${item.id}`;
};

/**
 * Staff Bonuses Section - Read-only
 * Shows bonuses but does not allow editing
 */
export function StaffBonusesSection() {
  const {
    purchaseBonuses,
    rechargeBonuses,
    transferBonuses,
    signupBonuses,
    firstPurchaseBonuses: storeFirstPurchaseBonuses,
    isLoading,
    error,
    fetchAllBonuses,
    clearErrors,
  } = useBonusesStore();

  const [activeTab, setActiveTab] = useState<'purchase' | 'recharge' | 'transfer' | 'signup' | 'first-purchase'>('purchase');

  const firstPurchaseBonuses = storeFirstPurchaseBonuses?.results || [];

  useEffect(() => {
    fetchAllBonuses();
  }, [fetchAllBonuses]);

  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <div className="flex flex-col shrink-0">
              <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => fetchAllBonuses()}
      />
    );
  }

  const getCurrentBonuses = () => {
    switch (activeTab) {
      case 'purchase':
        return purchaseBonuses?.results || [];
      case 'recharge':
        return rechargeBonuses?.results || [];
      case 'transfer':
        return transferBonuses?.results || [];
      case 'signup':
        return signupBonuses?.results || [];
      case 'first-purchase':
        return firstPurchaseBonuses;
      default:
        return [];
    }
  };

  const currentBonuses = getCurrentBonuses();

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col shrink-0">
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Bonuses
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              View all bonus configurations (read-only)
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'purchase', label: 'Purchase', count: purchaseBonuses?.count || 0 },
            { id: 'recharge', label: 'Recharge', count: rechargeBonuses?.count || 0 },
            { id: 'transfer', label: 'Transfer', count: transferBonuses?.count || 0 },
            { id: 'signup', label: 'Signup', count: signupBonuses?.count || 0 },
            { id: 'first-purchase', label: 'First Purchase', count: firstPurchaseBonuses.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Bonuses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {currentBonuses.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title={`No ${activeTab} bonuses found`}
              description="No bonuses are configured for this type"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBonuses.map((bonus) => {
                  const displayName = getBonusDisplayName(bonus as AllItems);
                  const isEnabled = 'is_enabled' in bonus ? bonus.is_enabled : true;
                  const amount = 'bonus_amount' in bonus
                    ? bonus.bonus_amount
                    : 'amount' in bonus
                    ? (bonus as { amount?: number }).amount
                    : null;

                  return (
                    <TableRow key={bonus.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {displayName}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{activeTab}</span>
                      </TableCell>
                      <TableCell>
                        {amount !== null ? (
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(amount)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isEnabled ? 'success' : 'danger'}>
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

