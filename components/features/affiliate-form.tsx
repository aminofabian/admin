'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Affiliate, UpdateAffiliateRequest } from '@/types';

interface AffiliateFormProps {
  onSubmit: (data: UpdateAffiliateRequest) => Promise<void>;
  onCancel: () => void;
  initialData: Affiliate;
}

export function AffiliateForm({ onSubmit, onCancel, initialData }: AffiliateFormProps) {
  const [formData, setFormData] = useState({
    affiliation_percentage: parseFloat(initialData.affiliate_percentage) || 0,
    affiliation_fee_percentage: parseFloat(initialData.affiliate_fee) || 0,
    payment_method_fee_percentage: parseFloat(initialData.payment_method_fee) || 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.affiliation_percentage < 0 || formData.affiliation_percentage > 100) {
      newErrors.affiliation_percentage = 'Must be between 0 and 100';
    }

    if (formData.affiliation_fee_percentage < 0 || formData.affiliation_fee_percentage > 100) {
      newErrors.affiliation_fee_percentage = 'Must be between 0 and 100';
    }

    if (formData.payment_method_fee_percentage < 0 || formData.payment_method_fee_percentage > 100) {
      newErrors.payment_method_fee_percentage = 'Must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[#6366f1]/10 dark:bg-[#6366f1]/20 border border-[#6366f1]/30 dark:border-[#6366f1]/50 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-[#6366f1] dark:text-[#6366f1] mb-2">
          Agent: {initialData.name}
        </h4>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Email: {initialData.email}
        </p>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Total Players: {initialData.total_players}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Affiliation Percentage *
        </label>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={formData.affiliation_percentage}
          onChange={(e) => setFormData({ ...formData, affiliation_percentage: parseFloat(e.target.value) || 0 })}
          className={errors.affiliation_percentage ? 'border-red-500' : ''}
          placeholder="0.00"
        />
        {errors.affiliation_percentage && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.affiliation_percentage}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Commission percentage for the agent
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Affiliation Fee Percentage *
        </label>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={formData.affiliation_fee_percentage}
          onChange={(e) => setFormData({ ...formData, affiliation_fee_percentage: parseFloat(e.target.value) || 0 })}
          className={errors.affiliation_fee_percentage ? 'border-red-500' : ''}
          placeholder="0.00"
        />
        {errors.affiliation_fee_percentage && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.affiliation_fee_percentage}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Fee percentage deducted from earnings
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Payment Method Fee Percentage *
        </label>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={formData.payment_method_fee_percentage}
          onChange={(e) => setFormData({ ...formData, payment_method_fee_percentage: parseFloat(e.target.value) || 0 })}
          className={errors.payment_method_fee_percentage ? 'border-red-500' : ''}
          placeholder="0.00"
        />
        {errors.payment_method_fee_percentage && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.payment_method_fee_percentage}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Payment method fee percentage
        </p>
      </div>

      <div className="flex space-x-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Updating...' : 'Update Commission'}
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

