'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { 
  BaseBonusSettings,
  PurchaseBonusSettings,
  CreatePurchaseBonusRequest,
  UpdateBonusSettingsRequest,
  BonusType 
} from '@/types';

interface BonusSettingsFormProps {
  onSubmit: (data: CreatePurchaseBonusRequest | UpdateBonusSettingsRequest) => Promise<void>;
  onCancel: () => void;
  initialData?: BaseBonusSettings | PurchaseBonusSettings;
  type: 'purchase' | 'recharge' | 'transfer' | 'signup';
}

export function BonusSettingsForm({ onSubmit, onCancel, initialData, type }: BonusSettingsFormProps) {
  const [formData, setFormData] = useState({
    bonus_type: (initialData?.bonus_type || 'percentage') as BonusType,
    bonus: initialData?.bonus || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    is_enabled: 'is_enabled' in (initialData || {}) ? (initialData as any)?.is_enabled ?? true : true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    is_active: 'is_active' in (initialData || {}) ? (initialData as any)?.is_active ?? true : true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on_min_deposit: 'on_min_deposit' in (initialData || {}) ? (initialData as any)?.on_min_deposit ?? false : false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    min_deposit_amount: 'min_deposit_amount' in (initialData || {}) ? (initialData as any)?.min_deposit_amount || null : null,
    // Purchase bonus specific fields
    user: (initialData as PurchaseBonusSettings)?.user || 0,
    topup_method: (initialData as PurchaseBonusSettings)?.topup_method || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.bonus < 0) {
      newErrors.bonus = 'Bonus value must be positive';
    }

    if (formData.bonus_type === 'percentage' && formData.bonus > 100) {
      newErrors.bonus = 'Percentage bonus cannot exceed 100%';
    }

    if (formData.on_min_deposit && formData.min_deposit_amount !== null && formData.min_deposit_amount <= 0) {
      newErrors.min_deposit_amount = 'Minimum deposit amount must be positive';
    }

    // Purchase bonus specific validation (only for creating, but creation is disabled)
    // No validation needed for purchase bonuses in edit mode

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData = type === 'purchase' 
        ? {
            bonus: formData.bonus,
            is_active: formData.is_active,
          }
        : {
            bonus_type: formData.bonus_type,
            bonus: formData.bonus,
            is_enabled: formData.is_enabled,
            on_min_deposit: formData.on_min_deposit,
            min_deposit_amount: formData.on_min_deposit ? formData.min_deposit_amount : null,
          };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'purchase': return 'Purchase Bonus Settings';
      case 'recharge': return 'Recharge Bonus Settings';
      case 'transfer': return 'Transfer Bonus Settings';
      case 'signup': return 'Signup Bonus Settings';
      default: return 'Bonus Settings';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'purchase': return 'Configure user-specific purchase bonuses';
      case 'recharge': return 'Configure game-specific recharge bonuses';
      case 'transfer': return 'Configure balance transfer bonuses';
      case 'signup': return 'Configure new user registration bonuses';
      default: return 'Configure bonus settings';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {getTitle()}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {getDescription()}
        </p>
      </div>

      {/* Purchase bonus specific fields */}
      {type === 'purchase' && initialData && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
            Bonus Information
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Payment Method
            </label>
            <div className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              {(initialData as PurchaseBonusSettings).topup_method}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Bonus Type
            </label>
            <div className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 capitalize">
              {initialData.bonus_type}
            </div>
          </div>
        </div>
      )}

      {/* Bonus Configuration */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
          Bonus Configuration
        </h4>
        
        {type !== 'purchase' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Bonus Type *
            </label>
            <select
              value={formData.bonus_type}
              onChange={(e) => setFormData({ ...formData, bonus_type: e.target.value as BonusType })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Bonus {type === 'purchase' && initialData ? 'Value' : 'Value *'}
          </label>
          <div className="relative">
            <Input
              type="number"
              value={formData.bonus}
              onChange={(e) => setFormData({ ...formData, bonus: parseFloat(e.target.value) || 0 })}
              className={errors.bonus ? 'border-red-500' : ''}
              placeholder="Enter bonus value"
              min="0"
              step="0.01"
            />
            {(type === 'purchase' ? initialData?.bonus_type : formData.bonus_type) === 'percentage' && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            )}
          </div>
          {errors.bonus && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bonus}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {(type === 'purchase' ? initialData?.bonus_type : formData.bonus_type) === 'percentage' 
              ? 'Percentage of the deposit amount (0-100%)'
              : 'Fixed amount to be added as bonus'
            }
          </p>
        </div>

        {/* Active/Inactive toggle for purchase bonuses */}
        {type === 'purchase' && (
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-[#6366f1] bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-[#6366f1]"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Active
            </label>
          </div>
        )}

        {/* Status and minimum deposit settings for non-purchase bonuses */}
        {type !== 'purchase' && (
          <>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_enabled"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                className="w-4 h-4 text-[#6366f1] bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-[#6366f1]"
              />
              <label htmlFor="is_enabled" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Enable Bonus
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="on_min_deposit"
                checked={formData.on_min_deposit}
                onChange={(e) => setFormData({ ...formData, on_min_deposit: e.target.checked })}
                className="w-4 h-4 text-[#6366f1] bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-[#6366f1]"
              />
              <label htmlFor="on_min_deposit" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Apply only on minimum deposit
              </label>
            </div>

            {formData.on_min_deposit && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Minimum Deposit Amount
                </label>
                <Input
                  type="number"
                  value={formData.min_deposit_amount || ''}
                  onChange={(e) => setFormData({ ...formData, min_deposit_amount: parseFloat(e.target.value) || null })}
                  className={errors.min_deposit_amount ? 'border-red-500' : ''}
                  placeholder="Enter minimum deposit amount"
                  min="0"
                  step="0.01"
                />
                {errors.min_deposit_amount && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.min_deposit_amount}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting 
            ? (type === 'purchase' || initialData ? 'Updating...' : 'Creating...') 
            : (type === 'purchase' || initialData ? 'Update Bonus' : 'Create Bonus')}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          variant="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
