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
  const [selectedBonus, setSelectedBonus] = useState<any>(null);

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
    updatePurchaseBonus,
    patchPurchaseBonus,
    deletePurchaseBonus,
    
    // Recharge Bonus Actions
    fetchRechargeBonuses,
    updateRechargeBonus,
    patchRechargeBonus,
    
    // Transfer Bonus Actions
    fetchTransferBonus,
    updateTransferBonus,
    patchTransferBonus,
    
    // Signup Bonus Actions
    fetchSignupBonus,
    updateSignupBonus,
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

  const handleEdit = (bonus: any) => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bonus Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure various types of bonuses across the platform
          </p>
        </div>
        {(activeTab === 'purchase' || (activeTab === 'transfer' && !transferBonus) || (activeTab === 'signup' && !signupBonus)) && (
          <button
            onClick={() => {
              setSelectedBonus(null);
              setIsDrawerOpen(true);
            }}
            className="px-4 py-2 bg-[#6366f1] hover:bg-[#5558e3] text-white rounded-lg transition-colors inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {activeTab === 'purchase' ? 'Add Purchase Bonus' : 
             activeTab === 'transfer' ? 'Configure Transfer Bonus' : 
             activeTab === 'signup' ? 'Configure Signup Bonus' : 'Add Bonus'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['purchase', 'recharge', 'transfer', 'signup'] as BonusType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#6366f1] text-[#6366f1] dark:text-[#6366f1]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {getTabTitle(tab)}
            </button>
          ))}
        </div>
        
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {getTabDescription(activeTab)}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {activeTab === 'purchase' ? (
                <>
                  <TableHead>User ID</TableHead>
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
                  colSpan={activeTab === 'purchase' ? 5 : 5}
                >
                  {activeTab === 'purchase' ? 'No purchase bonuses found' :
                   activeTab === 'recharge' ? 'No recharge bonuses found' :
                   activeTab === 'transfer' ? 'Transfer bonus not configured' :
                   'Signup bonus not configured'}
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((bonus: any) => (
                <TableRow key={bonus.id}>
                  {activeTab === 'purchase' ? (
                    <>
                      <TableCell className="font-medium">{bonus.user}</TableCell>
                      <TableCell>{bonus.topup_method}</TableCell>
                      <TableCell>
                        <Badge variant={bonus.bonus_type === 'percentage' ? 'info' : 'success'}>
                          {bonus.bonus_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bonus.bonus_type === 'percentage' ? `${bonus.bonus}%` : `${bonus.bonus}`}
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
                        {bonus.bonus_type === 'percentage' ? `${bonus.bonus}%` : `${bonus.bonus}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bonus.is_enabled ? 'success' : 'danger'}>
                          {bonus.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bonus.on_min_deposit && bonus.min_deposit_amount 
                          ? `${bonus.min_deposit_amount}` 
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

      {/* Pagination for purchase and recharge bonuses */}
      {(activeTab === 'purchase' || activeTab === 'recharge') && totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            hasPrevious={currentPage > 1}
            hasNext={currentPage < totalPages}
          />
        </div>
      )}

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedBonus(null);
        }}
        title={selectedBonus ? `Edit ${getTabTitle(activeTab)}` : `Add ${getTabTitle(activeTab)}`}
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
