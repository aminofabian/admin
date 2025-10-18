'use client';

import { useState, useEffect } from 'react';
import { useAffiliateSettingsStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/features';
import type { UpdateAffiliateDefaultsRequest } from '@/types';

export default function AffiliateSettingsPage() {
  const [formData, setFormData] = useState({
    default_affiliation_percentage: 0,
    default_fee_percentage: 0,
    default_payment_method_fee_percentage: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    affiliateDefaults,
    isLoading,
    error,
    fetchAffiliateDefaults,
    patchAffiliateDefaults,
  } = useAffiliateSettingsStore();

  useEffect(() => {
    fetchAffiliateDefaults();
  }, [fetchAffiliateDefaults]);

  useEffect(() => {
    if (affiliateDefaults) {
      setFormData({
        default_affiliation_percentage: parseFloat(affiliateDefaults.default_affiliation_percentage) || 0,
        default_fee_percentage: parseFloat(affiliateDefaults.default_fee_percentage) || 0,
        default_payment_method_fee_percentage: parseFloat(affiliateDefaults.default_payment_method_fee_percentage) || 0,
      });
    }
  }, [affiliateDefaults]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.default_affiliation_percentage < 0 || formData.default_affiliation_percentage > 100) {
      newErrors.default_affiliation_percentage = 'Affiliation percentage must be between 0 and 100';
    }

    if (formData.default_fee_percentage < 0 || formData.default_fee_percentage > 100) {
      newErrors.default_fee_percentage = 'Fee percentage must be between 0 and 100';
    }

    if (formData.default_payment_method_fee_percentage < 0 || formData.default_payment_method_fee_percentage > 100) {
      newErrors.default_payment_method_fee_percentage = 'Payment method fee percentage must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await patchAffiliateDefaults(formData);
      alert('Affiliate settings updated successfully!');
    } catch (err) {
      console.error('Error updating affiliate settings:', err);
      alert('Failed to update affiliate settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !affiliateDefaults) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAffiliateDefaults} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Affiliate Default Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure default commission percentages and fees for new affiliate agents
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Default Affiliation Percentage
            </label>
            <div className="relative">
              <Input
                type="number"
                value={formData.default_affiliation_percentage}
                onChange={(e) => setFormData({ ...formData, default_affiliation_percentage: parseFloat(e.target.value) || 0 })}
                className={errors.default_affiliation_percentage ? 'border-red-500' : ''}
                placeholder="Enter default affiliation percentage"
                min="0"
                max="100"
                step="0.01"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            </div>
            {errors.default_affiliation_percentage && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.default_affiliation_percentage}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Default commission percentage for new affiliate agents (0-100%)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Default Fee Percentage
            </label>
            <div className="relative">
              <Input
                type="number"
                value={formData.default_fee_percentage}
                onChange={(e) => setFormData({ ...formData, default_fee_percentage: parseFloat(e.target.value) || 0 })}
                className={errors.default_fee_percentage ? 'border-red-500' : ''}
                placeholder="Enter default fee percentage"
                min="0"
                max="100"
                step="0.01"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            </div>
            {errors.default_fee_percentage && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.default_fee_percentage}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Default fee percentage for new affiliate agents (0-100%)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Default Payment Method Fee Percentage
            </label>
            <div className="relative">
              <Input
                type="number"
                value={formData.default_payment_method_fee_percentage}
                onChange={(e) => setFormData({ ...formData, default_payment_method_fee_percentage: parseFloat(e.target.value) || 0 })}
                className={errors.default_payment_method_fee_percentage ? 'border-red-500' : ''}
                placeholder="Enter default payment method fee percentage"
                min="0"
                max="100"
                step="0.01"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                %
              </span>
            </div>
            {errors.default_payment_method_fee_percentage && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.default_payment_method_fee_percentage}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Default payment method fee percentage for new affiliate agents (0-100%)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-6"
            >
              {isSubmitting ? 'Updating...' : 'Update Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
