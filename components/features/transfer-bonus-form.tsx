'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import type { UpdateBonusRequest, TransferBonus } from '@/types';

interface TransferBonusFormProps {
  onSubmit: (data: UpdateBonusRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: TransferBonus;
}

export function TransferBonusForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData,
}: TransferBonusFormProps) {
  const [formData, setFormData] = useState<UpdateBonusRequest>({
    bonus: initialData?.bonus || 0,
    is_enabled: initialData?.is_enabled ?? true,
  });
  const [bonusDisplay, setBonusDisplay] = useState<string>(
    initialData?.bonus ? String(initialData.bonus) : ''
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        bonus: initialData.bonus,
        is_enabled: initialData.is_enabled ?? true,
      });
      setBonusDisplay(String(initialData.bonus));
    }
  }, [initialData]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bonus || formData.bonus <= 0) {
      newErrors.bonus = 'Bonus value is required and must be greater than 0';
    } else if (formData.bonus > 100) {
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
      await onSubmit({
        bonus: Number(formData.bonus),
        is_enabled: formData.is_enabled,
      });
    } catch (error) {
      console.error('Error updating bonus:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof UpdateBonusRequest, value: string | boolean) => {
    if (field === 'bonus') {
      setBonusDisplay(value as string);
      const numValue = parseFloat(value as string) || 0;
      setFormData(prev => ({ ...prev, bonus: numValue }));
    } else if (field === 'is_enabled') {
      setFormData(prev => ({ ...prev, is_enabled: value as boolean }));
    }
    
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
      {/* Edit Mode Info Banner */}
      <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
              Editing Bonus
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              You can only update the bonus percentage and active status.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Transfer/Game Name - Display only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Transfer/Game Name
          </label>
          <div className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
            {initialData?.name || 'N/A'}
          </div>
        </div>

        {/* Bonus Type Display - Always Percentage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bonus Type
          </label>
          <div className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
            Percentage
          </div>
        </div>

        {/* Percentage Bonus Value */}
        <div>
          <label htmlFor="bonus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Percentage Bonus *
          </label>
          <div className="relative">
            <input
              type="number"
              id="bonus"
              value={bonusDisplay}
              onChange={(e) => handleInputChange('bonus', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white transition-colors ${
                errors.bonus ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter percentage (e.g., 10)"
              min="0"
              max="100"
              step="0.1"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">%</span>
            </div>
          </div>
          {errors.bonus && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bonus}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter percentage value (0-100)
          </p>
        </div>

        {/* Active/Inactive Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleInputChange('is_enabled', !formData.is_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                formData.is_enabled
                  ? 'bg-primary'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={formData.is_enabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {formData.is_enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Toggle to activate or deactivate this bonus
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-colors"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || isLoading}
          className="px-5 py-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isSubmitting || isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </div>
          ) : (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Update Bonus
            </div>
          )}
        </Button>
      </div>
    </form>
  );
}

