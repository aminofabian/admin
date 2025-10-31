'use client';

import { useState, useEffect } from 'react';
import { useAffiliateSettingsStore } from '@/stores';
import { Button, Input } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';

export function AffiliateSettingsSection() {
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
      newErrors.default_affiliation_percentage = 'Must be between 0 and 100';
    }

    if (formData.default_fee_percentage < 0 || formData.default_fee_percentage > 100) {
      newErrors.default_fee_percentage = 'Must be between 0 and 100';
    }

    if (formData.default_payment_method_fee_percentage < 0 || formData.default_payment_method_fee_percentage > 100) {
      newErrors.default_payment_method_fee_percentage = 'Must be between 0 and 100';
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
    } catch (err) {
      console.error('Error updating settings:', err);
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
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Affiliate Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Configure default commission percentages and fees for new affiliate agents
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Affiliation Percentage */}
        <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-semibold text-foreground">
                Default Affiliation Percentage
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.default_affiliation_percentage}
                  onChange={(e) => setFormData({ ...formData, default_affiliation_percentage: parseFloat(e.target.value) || 0 })}
                  className={errors.default_affiliation_percentage ? 'border-red-500' : ''}
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              {errors.default_affiliation_percentage ? (
                <p className="text-sm text-red-600">{errors.default_affiliation_percentage}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Default commission percentage for new affiliate agents (0-100%)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Fee Percentage */}
        <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-semibold text-foreground">
                Default Fee Percentage
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.default_fee_percentage}
                  onChange={(e) => setFormData({ ...formData, default_fee_percentage: parseFloat(e.target.value) || 0 })}
                  className={errors.default_fee_percentage ? 'border-red-500' : ''}
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              {errors.default_fee_percentage ? (
                <p className="text-sm text-red-600">{errors.default_fee_percentage}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Default fee percentage for new affiliate agents (0-100%)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method Fee */}
        <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-semibold text-foreground">
                Default Payment Method Fee Percentage
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.default_payment_method_fee_percentage}
                  onChange={(e) => setFormData({ ...formData, default_payment_method_fee_percentage: parseFloat(e.target.value) || 0 })}
                  className={errors.default_payment_method_fee_percentage ? 'border-red-500' : ''}
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              {errors.default_payment_method_fee_percentage ? (
                <p className="text-sm text-red-600">{errors.default_payment_method_fee_percentage}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Default payment method fee percentage for new affiliate agents (0-100%)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            {isSubmitting ? 'Updating...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
