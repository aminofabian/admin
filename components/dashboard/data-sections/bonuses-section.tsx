'use client';

import { useEffect, useState } from 'react';
import type { 
  CreatePurchaseBonusRequest,
  PurchaseBonusSettings,
  RechargeBonusSettings,
  TransferBonusSettings,
  SignupBonusSettings,
  AffiliateDefaults
} from '@/types';
import { LoadingState, ErrorState, EmptyState, PurchaseBonusForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, Drawer } from '@/components/ui';
import { useBonusesStore } from '@/stores/use-bonuses-store';

type BonusItem = PurchaseBonusSettings | RechargeBonusSettings | TransferBonusSettings | SignupBonusSettings;
type AllItems = BonusItem | AffiliateDefaults;

export function BonusesSection() {
  const {
    purchaseBonuses,
    rechargeBonuses,
    transferBonuses,
    signupBonuses,
    affiliateDefaults,
    isLoading,
    error,
    currentPage,
    searchTerm,
    pageSize,
    operationLoading,
    createPurchaseBonus,
    fetchAllBonuses,
    setPage,
    setSearchTerm,
    clearErrors,
  } = useBonusesStore();

  // Local state for UI
  const [activeTab, setActiveTab] = useState<'purchase' | 'recharge' | 'transfer' | 'signup' | 'affiliate'>('purchase');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const handleCreatePurchaseBonus = async (data: CreatePurchaseBonusRequest) => {
    try {
      await createPurchaseBonus(data);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error creating purchase bonus:', error);
    }
  };


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };


  // Show loading state
  if (isLoading && !purchaseBonuses && !rechargeBonuses && !transferBonuses && !signupBonuses && !affiliateDefaults) {
    return <LoadingState />;
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
        return signupBonuses?.results || [];
      case 'affiliate':
        return affiliateDefaults?.results || [];
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
        return signupBonuses?.count || 0;
      case 'affiliate':
        return affiliateDefaults?.count || 0;
      default:
        return 0;
    }
  };

  const getActiveCount = () => {
    const data = getCurrentData();
    if (activeTab === 'affiliate') return 0; // AffiliateDefaults doesn't have is_enabled
    return data.filter((item: AllItems) => 'is_enabled' in item && item.is_enabled).length;
  };

  const getInactiveCount = () => {
    const data = getCurrentData();
    if (activeTab === 'affiliate') return 0; // AffiliateDefaults doesn't have is_enabled
    return data.filter((item: AllItems) => 'is_enabled' in item && !item.is_enabled).length;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
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
              <h2 className="text-3xl font-bold text-foreground">Bonus Management</h2>
              <p className="text-muted-foreground mt-1">
                Manage all types of bonuses and affiliate settings
              </p>
            </div>
          </div>
          {activeTab === 'purchase' && (
            <Button 
              variant="primary" 
              size="md"
              onClick={() => setIsDrawerOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Purchase Bonus
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex space-x-1 p-1">
        {[
          { key: 'purchase', label: 'Purchase', count: purchaseBonuses?.count || 0 },
          { key: 'recharge', label: 'Recharge', count: rechargeBonuses?.count || 0 },
          { key: 'transfer', label: 'Transfer', count: transferBonuses?.count || 0 },
          { key: 'signup', label: 'Signup', count: signupBonuses?.count || 0 },
          { key: 'affiliate', label: 'Affiliate', count: affiliateDefaults?.count || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'purchase' | 'recharge' | 'transfer' | 'signup' | 'affiliate')}
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
      </div>

      {/* Search */}
      <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={`Search ${activeTab} bonuses...`}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Total {activeTab} Bonuses</div>
            <div className="text-2xl font-bold text-foreground mt-1">{getCurrentCount()}</div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-2xl font-bold text-green-500 mt-1">{getActiveCount()}</div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Inactive</div>
            <div className="text-2xl font-bold text-red-500 mt-1">{getInactiveCount()}</div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">This Page</div>
            <div className="text-2xl font-bold text-foreground mt-1">{getCurrentData().length}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
        <Table>
          <TableHeader>
            {activeTab === 'purchase' ? (
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Topup Method</TableHead>
                <TableHead>Bonus Type</TableHead>
                <TableHead>Bonus Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            ) : activeTab === 'affiliate' ? (
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Commission %</TableHead>
                <TableHead>Fee %</TableHead>
                <TableHead>Payment Method Fee %</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            ) : (
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Bonus Type</TableHead>
                <TableHead>Bonus Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Display Text</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {getCurrentData().map((item: AllItems) => (
              <TableRow key={item.id}>
                {activeTab === 'purchase' ? (
                  <>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{(item as PurchaseBonusSettings).user}</TableCell>
                    <TableCell>
                      <Badge variant="info">{(item as PurchaseBonusSettings).topup_method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{(item as PurchaseBonusSettings).bonus_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {(item as PurchaseBonusSettings).bonus_type === 'percentage' ? `${(item as PurchaseBonusSettings).bonus}%` : `$${(item as PurchaseBonusSettings).bonus}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {/* Handle delete */}}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : activeTab === 'affiliate' ? (
                  <>
                    <TableCell>{item.id}</TableCell>
                    <TableCell className="font-medium">{(item as AffiliateDefaults).default_affiliation_percentage}%</TableCell>
                    <TableCell className="font-medium">{(item as AffiliateDefaults).default_fee_percentage}%</TableCell>
                    <TableCell className="font-medium">{(item as AffiliateDefaults).default_payment_method_fee_percentage}%</TableCell>
                    <TableCell>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {/* Handle edit */}}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    {/* eslint-disable @typescript-eslint/no-explicit-any */}
                    <TableCell>{item.id}</TableCell>
                    <TableCell className="font-medium">{'name' in item ? (item as any).name : `Bonus ${item.id}`}</TableCell>
                    <TableCell>
                      <Badge variant="default">{'bonus_type' in item ? (item as any).bonus_type : 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {'bonus_type' in item && 'bonus' in item 
                        ? ((item as any).bonus_type === 'percentage' ? `${(item as any).bonus}%` : `$${(item as any).bonus}`)
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
                    <TableCell>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {/* Handle edit */}}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Empty State */}
      {getCurrentData().length === 0 && (
        <EmptyState title={`No ${activeTab} bonuses found`} />
      )}

      {/* Pagination */}
      {getCurrentCount() > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(getCurrentCount() / pageSize)}
          hasNext={false}
          hasPrevious={false}
          onPageChange={setPage}
        />
      )}

      {/* Add Purchase Bonus Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Purchase Bonus"
        size="lg"
      >
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        <PurchaseBonusForm
          onSubmit={handleCreatePurchaseBonus}
          onCancel={() => setIsDrawerOpen(false)}
          isLoading={operationLoading.purchase}
        />
      </Drawer>

      {/* Edit/Delete Modals would go here */}
      {/* These would be implemented for editing other bonus types */}
    </div>
  );
}
