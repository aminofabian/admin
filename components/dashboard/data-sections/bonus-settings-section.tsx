'use client';

import { useState, useEffect } from 'react';
import { useBonusSettingsStore } from '@/stores';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Drawer } from '@/components/ui/drawer';
import { BonusSettingsForm } from '@/components/features';
import { LoadingState, ErrorState } from '@/components/features';
import type { 
  PurchaseBonusSettings,
  RechargeBonusSettings,
  CreatePurchaseBonusRequest,
  UpdateBonusSettingsRequest 
} from '@/types';

type BonusType = 'purchase' | 'recharge' | 'transfer' | 'signup';

export function BonusSettingsSection() {
  const [activeTab, setActiveTab] = useState<BonusType>('purchase');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<PurchaseBonusSettings | RechargeBonusSettings | null>(null);

  const {
    // Purchase Bonuses
    purchaseBonuses: purchaseBonusesData,
    purchaseBonusesLoading,
    purchaseBonusesError,
    
    // Recharge Bonuses
    rechargeBonuses: rechargeBonusesData,
    rechargeBonusesLoading,
    rechargeBonusesError,
    
    // Transfer Bonus
    transferBonus,
    transferBonusLoading,
    transferBonusError,
    
    // Signup Bonus
    signupBonus,
    signupBonusLoading,
    signupBonusError,
    
    currentPage,
    
    // Purchase Bonus Actions
    fetchPurchaseBonuses,
    createPurchaseBonus,
    patchPurchaseBonus,
    deletePurchaseBonus,
    
    // Recharge Bonus Actions
    fetchRechargeBonuses,
    patchRechargeBonus,
    
    // Transfer Bonus Actions
    fetchTransferBonus,
    patchTransferBonus,
    
    // Signup Bonus Actions
    fetchSignupBonus,
    patchSignupBonus,
    
    setPage,
  } = useBonusSettingsStore();

  useEffect(() => {
    // Load data based on active tab
    switch (activeTab) {
      case 'purchase':
        fetchPurchaseBonuses();
        break;
      case 'recharge':
        fetchRechargeBonuses();
        break;
      case 'transfer':
        fetchTransferBonus();
        break;
      case 'signup':
        fetchSignupBonus();
        break;
    }
  }, [activeTab, fetchPurchaseBonuses, fetchRechargeBonuses, fetchTransferBonus, fetchSignupBonus]);

  const handleSubmit = async (formData: CreatePurchaseBonusRequest | UpdateBonusSettingsRequest) => {
    try {
      switch (activeTab) {
        case 'purchase':
          if (selectedBonus) {
            await patchPurchaseBonus(selectedBonus.id, formData as UpdateBonusSettingsRequest);
          } else {
            await createPurchaseBonus(formData as CreatePurchaseBonusRequest);
          }
          break;
        case 'recharge':
          if (selectedBonus) {
            await patchRechargeBonus(selectedBonus.id, formData as UpdateBonusSettingsRequest);
          }
          break;
        case 'transfer':
          await patchTransferBonus(formData as UpdateBonusSettingsRequest);
          break;
        case 'signup':
          await patchSignupBonus(formData as UpdateBonusSettingsRequest);
          break;
      }
      setIsDrawerOpen(false);
      setSelectedBonus(null);
    } catch (err) {
      console.error('Error saving bonus:', err);
      throw err;
    }
  };

  const handleEdit = (bonus: PurchaseBonusSettings | RechargeBonusSettings) => {
    setSelectedBonus(bonus);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this purchase bonus?')) return;

    try {
      await deletePurchaseBonus(id);
    } catch (err) {
      console.error('Error deleting purchase bonus:', err);
      alert('Failed to delete purchase bonus');
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'purchase':
        return {
          data: purchaseBonusesData?.results || [],
          loading: purchaseBonusesLoading,
          error: purchaseBonusesError,
        };
      case 'recharge':
        return {
          data: rechargeBonusesData?.results || [],
          loading: rechargeBonusesLoading,
          error: rechargeBonusesError,
        };
      case 'transfer':
        return {
          data: transferBonus ? [transferBonus] : [],
          loading: transferBonusLoading,
          error: transferBonusError,
        };
      case 'signup':
        return {
          data: signupBonus ? [signupBonus] : [],
          loading: signupBonusLoading,
          error: signupBonusError,
        };
      default:
        return { data: [], loading: false, error: null };
    }
  };

  const getTabTitle = (tab: BonusType) => {
    switch (tab) {
      case 'purchase': return 'Purchase Bonuses';
      case 'recharge': return 'Recharge Bonuses';
      case 'transfer': return 'Transfer Bonus';
      case 'signup': return 'Signup Bonus';
      default: return 'Bonus Settings';
    }
  };

  const getTabDescription = (tab: BonusType) => {
    switch (tab) {
      case 'purchase': return 'User and payment method specific bonuses';
      case 'recharge': return 'Game-specific recharge bonuses (one per game)';
      case 'transfer': return 'Balance transfer bonus settings';
      case 'signup': return 'New user registration bonus settings';
      default: return 'Configure bonus settings';
    }
  };

  const { data: currentData, loading: currentLoading, error: currentError } = getCurrentData();

  if (currentLoading && currentData.length === 0) {
    return <LoadingState />;
  }

  if (currentError) {
    return <ErrorState message={currentError} onRetry={() => {
      switch (activeTab) {
        case 'purchase': fetchPurchaseBonuses(); break;
        case 'recharge': fetchRechargeBonuses(); break;
        case 'transfer': fetchTransferBonus(); break;
        case 'signup': fetchSignupBonus(); break;
      }
    }} />;
  }

  const totalCount = activeTab === 'purchase' ? purchaseBonusesData?.count || 0 : 
                     activeTab === 'recharge' ? rechargeBonusesData?.count || 0 : 1;
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {activeTab === 'purchase' ? 'Purchase Bonus' : 'Bonus Settings'}
              </h2>
              {activeTab === 'purchase' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Total Bonuses: <span className="font-semibold text-foreground">{purchaseBonusesData?.count || 0}</span>
                </p>
              )}
              {activeTab !== 'purchase' && (
                <p className="text-muted-foreground mt-1">
                  Configure various types of bonuses across the platform
                </p>
              )}
            </div>
          </div>
          {((activeTab === 'transfer' && !transferBonus) || (activeTab === 'signup' && !signupBonus)) && (
            <button
              onClick={() => {
                setSelectedBonus(null);
                setIsDrawerOpen(true);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-colors inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {activeTab === 'transfer' ? 'Configure Transfer Bonus' : 
               activeTab === 'signup' ? 'Configure Signup Bonus' : 'Add Bonus'}
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
          <div className="flex border-b border-border/30">
            {(['purchase', 'recharge', 'transfer', 'signup'] as BonusType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {getTabTitle(tab)}
              </button>
            ))}
          </div>
          
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              {getTabDescription(activeTab)}
            </p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
        <Table>
          <TableHeader>
            <TableRow>
              {activeTab === 'purchase' ? (
                <>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Bonus Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Bonus Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Min Deposit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell 
                  className="text-center py-12 text-gray-500 dark:text-gray-400" 
                  colSpan={activeTab === 'purchase' ? 4 : 5}
                >
                  {activeTab === 'purchase' ? 'No purchase bonuses found' :
                   activeTab === 'recharge' ? 'No recharge bonuses found' :
                   activeTab === 'transfer' ? 'Transfer bonus not configured' :
                   'Signup bonus not configured'}
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((bonus) => (
                <TableRow key={bonus.id}>
                  {activeTab === 'purchase' ? (
                    <>
                      <TableCell>{(bonus as PurchaseBonusSettings).topup_method}</TableCell>
                      <TableCell>
                        <Badge variant={bonus.bonus_type === 'percentage' ? 'info' : 'success'}>
                          {bonus.bonus_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bonus.bonus_type === 'percentage' ? `${bonus.bonus}` : `${bonus.bonus}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(bonus)}
                            className="text-[#6366f1] dark:text-[#6366f1] hover:text-[#5558e3] dark:hover:text-[#5558e3]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(bonus.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Badge variant={bonus.bonus_type === 'percentage' ? 'info' : 'success'}>
                          {bonus.bonus_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bonus.bonus_type === 'percentage' ? `${bonus.bonus}` : `${bonus.bonus}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={(bonus as RechargeBonusSettings).is_enabled ? 'success' : 'danger'}>
                          {(bonus as RechargeBonusSettings).is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(bonus as RechargeBonusSettings).on_min_deposit && (bonus as RechargeBonusSettings).min_deposit_amount 
                          ? `${(bonus as RechargeBonusSettings).min_deposit_amount}` 
                          : 'No minimum'}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleEdit(bonus)}
                          className="text-[#6366f1] dark:text-[#6366f1] hover:text-[#5558e3] dark:hover:text-[#5558e3]"
                        >
                          Edit
                        </button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Pagination for purchase and recharge bonuses */}
      {(activeTab === 'purchase' || activeTab === 'recharge') && totalPages > 1 && (
        <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              hasPrevious={currentPage > 1}
              hasNext={currentPage < totalPages}
            />
          </div>
        </div>
      )}

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedBonus(null);
        }}
        title={selectedBonus ? `Edit ${getTabTitle(activeTab)}` : activeTab === 'purchase' ? `Edit ${getTabTitle(activeTab)}` : `Add ${getTabTitle(activeTab)}`}
      >
        <BonusSettingsForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setSelectedBonus(null);
          }}
          initialData={selectedBonus || undefined}
          type={activeTab}
        />
      </Drawer>
    </div>
  );
}
