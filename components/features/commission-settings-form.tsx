'use client';

import { useState } from 'react';
import type { Affiliate, UpdateAffiliateRequest } from '@/types';
import { Button, Input } from '@/components/ui';

interface CommissionSettingsFormProps {
  affiliate: Affiliate;
  onSubmit: (data: UpdateAffiliateRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CommissionSettingsForm({
  affiliate,
  onSubmit,
  onCancel,
  isLoading = false,
}: CommissionSettingsFormProps) {
  const [formData, setFormData] = useState<UpdateAffiliateRequest>({
    affiliation_percentage: parseFloat(affiliate.affiliate_percentage),
    affiliation_fee_percentage: parseFloat(affiliate.affiliate_fee),
    payment_method_fee_percentage: parseFloat(affiliate.payment_method_fee),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.affiliation_percentage !== undefined) {
      if (formData.affiliation_percentage < 0 || formData.affiliation_percentage > 100) {
        newErrors.affiliation_percentage = 'Commission percentage must be between 0 and 100';
      }
    }

    if (formData.affiliation_fee_percentage !== undefined) {
      if (formData.affiliation_fee_percentage < 0 || formData.affiliation_fee_percentage > 100) {
        newErrors.affiliation_fee_percentage = 'Fee percentage must be between 0 and 100';
      }
    }

    if (formData.payment_method_fee_percentage !== undefined) {
      if (formData.payment_method_fee_percentage < 0 || formData.payment_method_fee_percentage > 100) {
        newErrors.payment_method_fee_percentage = 'Payment method fee percentage must be between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error updating commission settings:', error);
    }
  };

  const handleInputChange = (field: keyof UpdateAffiliateRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {affiliate.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {affiliate.email}
        </p>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>Total Players: <span className="font-medium">{affiliate.total_players}</span></p>
          <p>Total Earnings: <span className="font-medium text-green-600">${affiliate.total_earnings.toFixed(2)}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="affiliation_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Commission Percentage (%)
          </label>
          <Input
            id="affiliation_percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.affiliation_percentage}
            onChange={handleInputChange('affiliation_percentage')}
            error={errors.affiliation_percentage}
            placeholder="Enter commission percentage"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Percentage of earnings the affiliate receives (0-100%)
          </p>
        </div>

        <div>
          <label htmlFor="affiliation_fee_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fee Percentage (%)
          </label>
          <Input
            id="affiliation_fee_percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.affiliation_fee_percentage}
            onChange={handleInputChange('affiliation_fee_percentage')}
            error={errors.affiliation_fee_percentage}
            placeholder="Enter fee percentage"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Fee percentage deducted from affiliate earnings (0-100%)
          </p>
        </div>

        <div>
          <label htmlFor="payment_method_fee_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Payment Method Fee (%)
          </label>
          <Input
            id="payment_method_fee_percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.payment_method_fee_percentage}
            onChange={handleInputChange('payment_method_fee_percentage')}
            error={errors.payment_method_fee_percentage}
            placeholder="Enter payment method fee percentage"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Additional fee for payment method processing (0-100%)
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? 'Updating...' : 'Update Settings'}
        </Button>
      </div>
    </form>
  );
}
