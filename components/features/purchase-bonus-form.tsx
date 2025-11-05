'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import type { CreatePurchaseBonusRequest, PurchaseBonus } from '@/types';

interface PurchaseBonusFormProps {
  onSubmit: (data: CreatePurchaseBonusRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: PurchaseBonus;
  mode?: 'create' | 'edit';
}

export function PurchaseBonusForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData,
  mode = 'create'
}: PurchaseBonusFormProps) {
  const [formData, setFormData] = useState<CreatePurchaseBonusRequest>({
    user: initialData?.user || 0,
    topup_method: initialData?.topup_method || '',
    bonus_type: initialData?.bonus_type || 'percentage',
    bonus: initialData?.bonus || 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        user: initialData.user,
        topup_method: initialData.topup_method,
        bonus_type: initialData.bonus_type,
        bonus: initialData.bonus,
      });
    }
  }, [initialData]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topupMethods = [
    { value: 'bitcoin', label: 'Bitcoin' },
    { value: 'creditcard', label: 'Credit Card' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'e_wallet', label: 'E-Wallet' },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.user || formData.user <= 0) {
      newErrors.user = 'User ID is required and must be greater than 0';
    }

    if (!formData.topup_method) {
      newErrors.topup_method = 'Topup method is required';
    }

    if (!formData.bonus || formData.bonus <= 0) {
      newErrors.bonus = 'Bonus value is required and must be greater than 0';
    } else if (formData.bonus_type === 'percentage' && formData.bonus > 100) {
      newErrors.bonus = 'Percentage bonus cannot exceed 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: CreatePurchaseBonusRequest = {
        user: Number(formData.user),
        topup_method: formData.topup_method,
        bonus_type: formData.bonus_type,
        bonus: Number(formData.bonus),
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreatePurchaseBonusRequest, value: string) => {
    const processedValue = field === 'user' || field === 'bonus' ? parseInt(value) || 0 : value;
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* User ID */}
        <div>
          <label htmlFor="user" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            User ID *
          </label>
          <input
            type="number"
            id="user"
            value={formData.user}
            onChange={(e) => handleInputChange('user', e.target.value)}
            disabled={mode === 'edit'}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.user ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`}
            placeholder="Enter user ID"
            min="1"
            step="1"
          />
          {errors.user && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.user}</p>
          )}
        </div>

        {/* Topup Method */}
        <div>
          <label htmlFor="topup_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Topup Method *
          </label>
          <select
            id="topup_method"
            value={formData.topup_method}
            onChange={(e) => handleInputChange('topup_method', e.target.value)}
            disabled={mode === 'edit'}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.topup_method ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">Select topup method</option>
            {topupMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
          {errors.topup_method && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.topup_method}</p>
          )}
        </div>

        {/* Bonus Type */}
        <div>
          <label htmlFor="bonus_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bonus Type *
          </label>
          <select
            id="bonus_type"
            value={formData.bonus_type}
            onChange={(e) => handleInputChange('bonus_type', e.target.value)}
            disabled={mode === 'edit'}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
              mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>

        {/* Bonus Value */}
        <div>
          <label htmlFor="bonus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bonus Value * {formData.bonus_type === 'percentage' ? '(%)' : '($)'}
          </label>
          <div className="relative">
            <input
              type="number"
              id="bonus"
              value={formData.bonus}
              onChange={(e) => handleInputChange('bonus', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.bonus ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder={formData.bonus_type === 'percentage' ? 'Enter percentage (e.g., 10)' : 'Enter amount (e.g., 50)'}
              min="0"
              max={formData.bonus_type === 'percentage' ? '100' : undefined}
              step={formData.bonus_type === 'percentage' ? '0.1' : '0.01'}
            />
            {formData.bonus_type === 'percentage' && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
              </div>
            )}
          </div>
          {errors.bonus && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bonus}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formData.bonus_type === 'percentage' 
              ? 'Enter percentage value (1-100)' 
              : 'Enter fixed dollar amount'
            }
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {mode === 'edit' ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            mode === 'edit' ? 'Update Bonus' : 'Create Bonus'
          )}
        </Button>
      </div>
    </form>
  );
}
