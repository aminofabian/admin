'use client';

import { useEffect, useState } from 'react';
import type { 
  PurchaseBonusSettings,
  RechargeBonusSettings,
  TransferBonusSettings,
  SignupBonusSettings,
} from '@/types';
import { ErrorState, EmptyState, TransferBonusForm, SignupBonusForm, RechargeBonusForm, FirstPurchaseBonusForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, useToast, Drawer, Skeleton } from '@/components/ui';
import { useBonusesStore } from '@/stores/use-bonuses-store';
import { PurchaseBonusManager } from './purchase-bonus-manager';
import { formatCurrency } from '@/lib/utils/formatters';
import type { UpdateBonusRequest, TransferBonus, SignupBonus, RechargeBonus, PurchaseBonus, FirstPurchaseBonus } from '@/types';

type BonusItem = PurchaseBonusSettings | RechargeBonusSettings | TransferBonusSettings | SignupBonusSettings;
type AllItems = BonusItem | FirstPurchaseBonus;
type ToggleableBonus = RechargeBonusSettings | TransferBonusSettings | SignupBonusSettings;

const BONUS_TOGGLE_SUCCESS_TITLE = 'Bonus updated';
const BONUS_TOGGLE_ERROR_TITLE = 'Update failed';
const BONUS_TOGGLE_ERROR_DEFAULT = 'Failed to update bonus status';
const BONUS_ENABLE_LABEL = 'Enable';
const BONUS_DISABLE_LABEL = 'Disable';

export function BonusesSection() {
  const {
    purchaseBonuses,
    rechargeBonuses,
    transferBonuses,
    signupBonuses,
    firstPurchaseBonuses: storeFirstPurchaseBonuses,
    isLoading,
    error,
    currentPage,
    searchTerm,
    pageSize,
    operationLoading,
    fetchAllBonuses,
    updateRechargeBonus,
    updateTransferBonus,
    updateSignupBonus,
    updatePurchaseBonus,
    updateFirstPurchaseBonus,
    setPage,
    setSearchTerm,
    clearErrors,
  } = useBonusesStore();

  // Local state for UI
  const [activeTab, setActiveTab] = useState<'purchase' | 'recharge' | 'transfer' | 'signup' | 'first-purchase'>('purchase');
  const { addToast } = useToast();

  // Drawer state for editing bonuses
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBonus, setEditingBonus] = useState<TransferBonus | SignupBonus | RechargeBonus | FirstPurchaseBonus | null>(null);
  const [editingBonusType, setEditingBonusType] = useState<'transfer' | 'signup' | 'recharge' | 'first-purchase' | null>(null);

  // Use first purchase bonuses from store
  const firstPurchaseBonuses = storeFirstPurchaseBonuses?.results || [];

  // Initialize data on component mount
  useEffect(() => {
    fetchAllBonuses();
  }, [fetchAllBonuses]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const isToggleableBonus = (item: AllItems): item is ToggleableBonus => 'is_enabled' in item;

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

  const getToggleLoading = () => {
    if (activeTab === 'recharge') return operationLoading.recharge;
    if (activeTab === 'transfer') return operationLoading.transfer;
    if (activeTab === 'signup') return operationLoading.signup;
    return false;
  };

  const handleToggleBonus = async (bonus: ToggleableBonus) => {
    const nextStatus = !bonus.is_enabled;
    try {
      if (activeTab === 'recharge') {
        await updateRechargeBonus(bonus.id, { is_enabled: nextStatus });
      } else if (activeTab === 'transfer') {
        await updateTransferBonus(bonus.id, { is_enabled: nextStatus });
      } else if (activeTab === 'signup') {
        await updateSignupBonus(bonus.id, { is_enabled: nextStatus });
      } else {
        return;
      }

      const statusVerb = nextStatus ? 'enabled' : 'disabled';
      addToast({
        type: 'success',
        title: BONUS_TOGGLE_SUCCESS_TITLE,
        description: `"${getBonusDisplayName(bonus)}" has been ${statusVerb} successfully!`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : BONUS_TOGGLE_ERROR_DEFAULT;
      addToast({
        type: 'error',
        title: BONUS_TOGGLE_ERROR_TITLE,
        description: message,
      });
    }
  };

  const handleEditBonus = (bonus: TransferBonus | SignupBonus | RechargeBonus | FirstPurchaseBonus, type: 'transfer' | 'signup' | 'recharge' | 'first-purchase') => {
    setEditingBonus(bonus);
    setEditingBonusType(type);
    setIsDrawerOpen(true);
  };

  const handleUpdateBonus = async (data: UpdateBonusRequest) => {
    if (editingBonus && editingBonusType) {
      try {
        setIsSubmitting(true);
        if (editingBonusType === 'transfer') {
          await updateTransferBonus(editingBonus.id, data);
          addToast({
            type: 'success',
            title: 'Bonus Updated',
            description: `Bonus value has been successfully updated to ${data.bonus}.`,
          });
        } else if (editingBonusType === 'signup') {
          await updateSignupBonus(editingBonus.id, data);
          addToast({
            type: 'success',
            title: 'Bonus Updated',
            description: `Bonus amount has been successfully updated to ${formatCurrency(data.bonus?.toString() || '0')}.`,
          });
        } else if (editingBonusType === 'recharge') {
          await updateRechargeBonus(editingBonus.id, data);
          const bonusType = (editingBonus as RechargeBonus).bonus_type;
          addToast({
            type: 'success',
            title: 'Bonus Updated',
            description: `Bonus value has been successfully updated to ${data.bonus}.`,
          });
        } else if (editingBonusType === 'first-purchase') {
          await updateFirstPurchaseBonus(editingBonus.id, data);
          const bonusType = (editingBonus as FirstPurchaseBonus).bonus_type;
          addToast({
            type: 'success',
            title: 'Bonus Updated',
            description: bonusType === 'fixed'
              ? `Bonus amount has been successfully updated to ${formatCurrency(data.bonus?.toString() || '0')}.`
              : `Bonus percentage has been successfully updated to ${data.bonus}.`,
          });
        }
        setIsDrawerOpen(false);
        setEditingBonus(null);
        setEditingBonusType(null);
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
    setEditingBonusType(null);
  };


  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            {/* Icon Skeleton */}
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            
            {/* Title Skeleton */}
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 shrink-0" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-md" />
            ))}
          </div>
        </section>

        {/* Search Skeleton */}
        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <Skeleton className="h-10 w-full" />
        </section>

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
                    <Skeleton className="h-5 w-32" />
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

  // Show error state
  if (error) {
    return <ErrorState message={error} onRetry={fetchAllBonuses} />;
  }


  const getCurrentData = () => {
    switch (activeTab) {
      case 'purchase':
        return purchaseBonuses?.results || [];
      case 'recharge':
        return rechargeBonuses?.results || [];
      case 'transfer':
        return transferBonuses?.results || [];
      case 'signup':
        // Filter out first purchase bonuses from signup bonuses
        return signupBonuses?.results.filter(
          (bonus) => !bonus.name.toLowerCase().includes('first purchase')
        ) || [];
      case 'first-purchase':
        return firstPurchaseBonuses;
      default:
        return [];
    }
  };

  const getCurrentCount = () => {
    switch (activeTab) {
      case 'purchase':
        return purchaseBonuses?.count || 0;
      case 'recharge':
        return rechargeBonuses?.count || 0;
      case 'transfer':
        return transferBonuses?.count || 0;
      case 'signup':
        // Return filtered count (excluding first purchase bonuses)
        return signupBonuses?.results.filter(
          (bonus) => !bonus.name.toLowerCase().includes('first purchase')
        ).length || 0;
      case 'first-purchase':
        return storeFirstPurchaseBonuses?.count || firstPurchaseBonuses.length;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            Bonuses
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <div className="flex space-x-1">
          {[
            { key: 'purchase', label: 'Purchase', count: purchaseBonuses?.count || 0 },
            { key: 'recharge', label: 'Recharge', count: rechargeBonuses?.count || 0 },
            { key: 'transfer', label: 'Transfer', count: transferBonuses?.count || 0 },
            { key: 'signup', label: 'Signup', count: signupBonuses?.results.filter(
              (bonus) => !bonus.name.toLowerCase().includes('first purchase')
            ).length || 0 },
            { key: 'first-purchase', label: 'First Purchase', count: storeFirstPurchaseBonuses?.count || firstPurchaseBonuses.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'purchase' | 'recharge' | 'transfer' | 'signup' | 'first-purchase')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </section>

      {/* Render Purchase Bonus Manager for Purchase Tab */}
      {activeTab === 'purchase' ? (
        <PurchaseBonusManager 
          showHeader={false} 
          showStats={false}
        />
      ) : (
        <>
          {/* Search */}
          <section className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <SearchInput
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={`Search ${activeTab} bonuses...`}
            />
          </section>

          {/* Table Container */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {getCurrentData().length === 0 ? (
              <div className="py-12">
                <EmptyState title={`No ${activeTab} bonuses found`} />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {activeTab === 'first-purchase' ? (
                        <TableRow>
                          <TableHead>Bonus Name</TableHead>
                          <TableHead>Bonus Type</TableHead>
                          <TableHead>Bonus Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      ) : activeTab === 'transfer' ? (
                        <TableRow>
                          <TableHead>Bonus Name</TableHead>
                          <TableHead>Bonus Type</TableHead>
                          <TableHead>Bonus Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      ) : activeTab === 'signup' ? (
                        <TableRow>
                          <TableHead>Bonus Name</TableHead>
                          <TableHead>Bonus Type</TableHead>
                          <TableHead>Bonus Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      ) : activeTab === 'recharge' ? (
                        <TableRow>
                          <TableHead>Game Name</TableHead>
                          <TableHead>Bonus Type</TableHead>
                          <TableHead>Bonus Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Bonus Type</TableHead>
                          <TableHead>Bonus Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Display Text</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      )}
                    </TableHeader>
                    <TableBody>
                      {getCurrentData().map((item: AllItems) => (
                        <TableRow key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          {activeTab === 'first-purchase' ? (
                            <>
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                {(item as FirstPurchaseBonus).name}
                              </TableCell>
                              <TableCell>
                                <Badge variant={(item as FirstPurchaseBonus).bonus_type === 'fixed' ? 'warning' : 'success'}>
                                  {(item as FirstPurchaseBonus).bonus_type === 'fixed' ? 'Fixed' : 'Percentage'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                                {(item as FirstPurchaseBonus).bonus_type === 'fixed'
                                  ? formatCurrency((item as FirstPurchaseBonus).bonus.toString())
                                  : `${(item as FirstPurchaseBonus).bonus}%`
                                }
                              </TableCell>
                              <TableCell>
                                <Badge variant={(item as FirstPurchaseBonus).is_enabled ? 'success' : 'default'}>
                                  {(item as FirstPurchaseBonus).is_enabled ? 'Active' : 'Disabled'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                    onClick={() => handleEditBonus(item as FirstPurchaseBonus, 'first-purchase')}
                                    disabled={operationLoading.firstPurchase}
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : activeTab === 'transfer' ? (
                            <>
                              {/* eslint-disable @typescript-eslint/no-explicit-any */}
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                {'name' in item ? ((item as any).name || 'Transfer Bonus') : 'Transfer Bonus'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="success">Percentage</Badge>
                              </TableCell>
                              <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                                {'bonus' in item ? `${(item as any).bonus}%` : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={'is_enabled' in item && (item as any).is_enabled ? 'success' : 'default'}>
                                  {'is_enabled' in item && (item as any).is_enabled ? 'Active' : 'Disabled'}
                                </Badge>
                              </TableCell>
                              {/* eslint-enable @typescript-eslint/no-explicit-any */}
                              <TableCell className="text-right">
                                {isToggleableBonus(item) ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant={item.is_enabled ? 'danger' : 'primary'}
                                      size="sm"
                                      onClick={() => handleToggleBonus(item)}
                                      disabled={getToggleLoading()}
                                    >
                                      {item.is_enabled ? BONUS_DISABLE_LABEL : BONUS_ENABLE_LABEL}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                      onClick={() => handleEditBonus(item as unknown as TransferBonus, 'transfer')}
                                      disabled={operationLoading.transfer}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                      onClick={() => handleEditBonus(item as unknown as TransferBonus, 'transfer')}
                                      disabled={operationLoading.transfer}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </>
                          ) : activeTab === 'signup' ? (
                            <>
                              {/* eslint-disable @typescript-eslint/no-explicit-any */}
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                {'name' in item ? (item as any).name : `Bonus ${item.id}`}
                              </TableCell>
                              <TableCell>
                                <Badge variant="warning">Fixed</Badge>
                              </TableCell>
                              <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                                {'bonus' in item ? formatCurrency((item as any).bonus.toString()) : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={'is_enabled' in item && (item as any).is_enabled ? 'success' : 'default'}>
                                  {'is_enabled' in item && (item as any).is_enabled ? 'Active' : 'Disabled'}
                                </Badge>
                              </TableCell>
                              {/* eslint-enable @typescript-eslint/no-explicit-any */}
                              <TableCell className="text-right">
                                {isToggleableBonus(item) ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant={item.is_enabled ? 'danger' : 'primary'}
                                      size="sm"
                                      onClick={() => handleToggleBonus(item)}
                                      disabled={getToggleLoading()}
                                    >
                                      {item.is_enabled ? BONUS_DISABLE_LABEL : BONUS_ENABLE_LABEL}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                      onClick={() => handleEditBonus(item as unknown as SignupBonus, 'signup')}
                                      disabled={operationLoading.signup}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                      onClick={() => handleEditBonus(item as unknown as SignupBonus, 'signup')}
                                      disabled={operationLoading.signup}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </>
                          ) : activeTab === 'recharge' ? (
                            <>
                              {/* eslint-disable @typescript-eslint/no-explicit-any */}
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                {'name' in item ? (item as any).name : `Bonus ${item.id}`}
                              </TableCell>
                              <TableCell>
                                <Badge variant={(item as any).bonus_type === 'percentage' ? 'success' : 'warning'}>
                                  {(item as any).bonus_type === 'percentage' ? 'Percentage' : 'Fixed'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                                {'bonus_type' in item && 'bonus' in item 
                                  ? ((item as any).bonus_type === 'percentage' 
                                      ? `${(item as any).bonus}%` 
                                      : formatCurrency((item as any).bonus.toString()))
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={'is_enabled' in item && (item as any).is_enabled ? 'success' : 'default'}>
                                  {'is_enabled' in item && (item as any).is_enabled ? 'Active' : 'Disabled'}
                                </Badge>
                              </TableCell>
                              {/* eslint-enable @typescript-eslint/no-explicit-any */}
                              <TableCell className="text-right">
                                {isToggleableBonus(item) ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant={item.is_enabled ? 'danger' : 'primary'}
                                      size="sm"
                                      onClick={() => handleToggleBonus(item)}
                                      disabled={getToggleLoading()}
                                    >
                                      {item.is_enabled ? BONUS_DISABLE_LABEL : BONUS_ENABLE_LABEL}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                      onClick={() => handleEditBonus(item as unknown as RechargeBonus, 'recharge')}
                                      disabled={operationLoading.recharge}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                      onClick={() => handleEditBonus(item as unknown as RechargeBonus, 'recharge')}
                                      disabled={operationLoading.recharge}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              {/* eslint-disable @typescript-eslint/no-explicit-any */}
                              <TableCell className="text-gray-900 dark:text-gray-100">{item.id}</TableCell>
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">{'name' in item ? (item as any).name : `Bonus ${item.id}`}</TableCell>
                              <TableCell>
                                <Badge variant="default">{'bonus_type' in item ? (item as any).bonus_type : 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                {'bonus_type' in item && 'bonus' in item 
                                  ? ((item as any).bonus_type === 'percentage' ? `${(item as any).bonus}` : `$${(item as any).bonus}`)
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={'is_enabled' in item && (item as any).is_enabled ? 'success' : 'danger'}>
                                  {'is_enabled' in item && (item as any).is_enabled ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">
                                {'display_text' in item ? (item as any).display_text : 'N/A'}
                              </TableCell>
                              {/* eslint-enable @typescript-eslint/no-explicit-any */}
                              <TableCell className="text-right">
                                {isToggleableBonus(item) ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant={item.is_enabled ? 'danger' : 'primary'}
                                      size="sm"
                                      onClick={() => handleToggleBonus(item)}
                                      disabled={getToggleLoading()}
                                    >
                                      {item.is_enabled ? BONUS_DISABLE_LABEL : BONUS_ENABLE_LABEL}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                      onClick={() => {/* Handle edit */}}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                      onClick={() => {/* Handle edit */}}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {getCurrentCount() > pageSize && (
                  <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(getCurrentCount() / pageSize)}
                      hasNext={false}
                      hasPrevious={false}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Edit Bonus Drawers */}
      {editingBonusType === 'transfer' && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          title="Edit Transfer Bonus"
        >
          <TransferBonusForm
            onSubmit={handleUpdateBonus}
            onCancel={handleCloseDrawer}
            isLoading={isSubmitting || operationLoading.transfer}
            initialData={editingBonus as TransferBonus | undefined}
          />
        </Drawer>
      )}

      {editingBonusType === 'signup' && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          title="Edit Sign Up Bonus"
        >
          <SignupBonusForm
            onSubmit={handleUpdateBonus}
            onCancel={handleCloseDrawer}
            isLoading={isSubmitting || operationLoading.signup}
            initialData={editingBonus as SignupBonus | undefined}
          />
        </Drawer>
      )}

      {editingBonusType === 'recharge' && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          title="Edit Recharge Bonus"
        >
          <RechargeBonusForm
            onSubmit={handleUpdateBonus}
            onCancel={handleCloseDrawer}
            isLoading={isSubmitting || operationLoading.recharge}
            initialData={editingBonus as RechargeBonus | undefined}
          />
        </Drawer>
      )}

      {editingBonusType === 'first-purchase' && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          title="Edit First Purchase Bonus"
        >
          <FirstPurchaseBonusForm
            onSubmit={handleUpdateBonus}
            onCancel={handleCloseDrawer}
            isLoading={isSubmitting || operationLoading.firstPurchase}
            initialData={editingBonus as FirstPurchaseBonus | undefined}
          />
        </Drawer>
      )}
    </div>
  );
}
