'use client';

import { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PaymentMethod, PaymentMethodAction, CashoutSubcategory, PurchaseSubcategory } from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';

type AmountScope = 'admin' | 'superadmin';

export interface AmountValidationErrors {
  minAmount?: string;
  maxAmount?: string;
}

interface AmountValidationContext {
  scope: AmountScope;
  action: PaymentMethodAction;
  paymentMethod: (PaymentMethod | CashoutSubcategory | PurchaseSubcategory) | null;
  minAmount: string | number;
  maxAmount: string | number;
}

const formatCurrencyLimit = (value: number): string => {
  return `$${value.toFixed(2)}`;
};

const ensureString = (v: unknown): string =>
  typeof v === 'string' ? v : v != null ? String(v) : '';

export const validatePaymentAmounts = ({
  scope,
  action,
  paymentMethod,
  minAmount,
  maxAmount,
}: AmountValidationContext): AmountValidationErrors => {
  const errors: AmountValidationErrors = {};

  const minStr = ensureString(minAmount);
  const maxStr = ensureString(maxAmount);
  const hasMin = minStr.trim() !== '';
  const hasMax = maxStr.trim() !== '';

  const parsedMin = hasMin ? parseFloat(minStr) : NaN;
  const parsedMax = hasMax ? parseFloat(maxStr) : NaN;

  if (hasMin) {
    if (isNaN(parsedMin) || parsedMin < 0) {
      errors.minAmount = 'Minimum amount must be a valid positive number';
    }
  }

  if (hasMax) {
    if (isNaN(parsedMax) || parsedMax < 0) {
      errors.maxAmount = 'Maximum amount must be a valid positive number';
    }
  }

  if (hasMin && hasMax && !isNaN(parsedMin) && !isNaN(parsedMax) && parsedMin > parsedMax) {
    errors.maxAmount = 'Maximum amount must be greater than or equal to minimum amount';
  }

  // For admin scope, enforce superadmin global limits when present
  if (scope === 'admin' && paymentMethod) {
    let superMinRaw: string | null | undefined;
    let superMaxRaw: string | null | undefined;

    if (action === 'cashout') {
      superMinRaw = 'superadmin_min_amount_cashout' in paymentMethod ? paymentMethod.superadmin_min_amount_cashout : undefined;
      superMaxRaw = 'superadmin_max_amount_cashout' in paymentMethod ? paymentMethod.superadmin_max_amount_cashout : undefined;
    } else {
      superMinRaw = 'superadmin_min_amount_purchase' in paymentMethod ? paymentMethod.superadmin_min_amount_purchase : undefined;
      superMaxRaw = 'superadmin_max_amount_purchase' in paymentMethod ? paymentMethod.superadmin_max_amount_purchase : undefined;
    }

    const superMin = superMinRaw != null && superMinRaw !== '' ? parseFloat(superMinRaw) : NaN;
    const superMax = superMaxRaw != null && superMaxRaw !== '' ? parseFloat(superMaxRaw) : NaN;

    if (!isNaN(superMin) && hasMin && !isNaN(parsedMin) && parsedMin < superMin) {
      errors.minAmount = `Minimum amount must be at least ${formatCurrencyLimit(superMin)}`;
    }

    if (!isNaN(superMax) && hasMax && !isNaN(parsedMax) && parsedMax > superMax) {
      errors.maxAmount = `Maximum amount must be at most ${formatCurrencyLimit(superMax)}`;
    }

    if (!isNaN(superMin) && hasMax && !isNaN(parsedMax) && parsedMax < superMin) {
      // If admin sets only max and it is below the allowed minimum
      errors.maxAmount = `Maximum amount cannot be below the minimum of ${formatCurrencyLimit(
        superMin,
      )}`;
    }

    if (!isNaN(superMax) && hasMin && !isNaN(parsedMin) && parsedMin > superMax) {
      // If admin sets only min and it is above the allowed maximum
      errors.minAmount = `Minimum amount cannot exceed the maximum of ${formatCurrencyLimit(
        superMax,
      )}`;
    }
  }

  return errors;
};

interface PaymentAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: (PaymentMethod | CashoutSubcategory | PurchaseSubcategory) | null;
  action: PaymentMethodAction;
  onSave: (minAmount: number | null, maxAmount: number | null) => Promise<void>;
  isLoading?: boolean;
  scope?: AmountScope;
}

export function PaymentAmountModal({
  isOpen,
  onClose,
  paymentMethod,
  action,
  onSave,
  isLoading = false,
  scope = 'admin',
}: PaymentAmountModalProps) {
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [errors, setErrors] = useState<AmountValidationErrors>({});

  useEffect(() => {
    if (paymentMethod && isOpen) {
      let minVal: string | null | undefined;
      let maxVal: string | null | undefined;

      if (action === 'cashout') {
        minVal =
          scope === 'superadmin' && 'superadmin_min_amount_cashout' in paymentMethod
            ? paymentMethod.superadmin_min_amount_cashout
            : 'min_amount_cashout' in paymentMethod
              ? paymentMethod.min_amount_cashout
              : undefined;
        maxVal =
          scope === 'superadmin' && 'superadmin_max_amount_cashout' in paymentMethod
            ? paymentMethod.superadmin_max_amount_cashout
            : 'max_amount_cashout' in paymentMethod
              ? paymentMethod.max_amount_cashout
              : undefined;
      } else {
        minVal =
          scope === 'superadmin' && 'superadmin_min_amount_purchase' in paymentMethod
            ? paymentMethod.superadmin_min_amount_purchase
            : 'min_amount_purchase' in paymentMethod
              ? paymentMethod.min_amount_purchase
              : undefined;
        maxVal =
          scope === 'superadmin' && 'superadmin_max_amount_purchase' in paymentMethod
            ? paymentMethod.superadmin_max_amount_purchase
            : 'max_amount_purchase' in paymentMethod
              ? paymentMethod.max_amount_purchase
              : undefined;
      }

      setMinAmount(minVal != null && minVal !== '' ? String(minVal) : '');
      setMaxAmount(maxVal != null && maxVal !== '' ? String(maxVal) : '');
      setErrors({});
    }
  }, [paymentMethod, action, isOpen, scope]);

  const validateForm = (): boolean => {
    const newErrors = validatePaymentAmounts({
      scope,
      action,
      paymentMethod,
      minAmount,
      maxAmount,
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const min = minAmount.trim() === '' ? null : parseFloat(minAmount);
    const max = maxAmount.trim() === '' ? null : parseFloat(maxAmount);

    await onSave(min, max);
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!paymentMethod) return null;

  const actionLabel = action === 'cashout' ? 'Cashout' : 'Purchase';
  const title =
    scope === 'superadmin'
      ? `Set Superadmin ${actionLabel} Limits`
      : `Edit ${actionLabel} Amounts`;

  const superMinRaw =
    scope === 'admin' && paymentMethod
      ? action === 'cashout'
        ? ('superadmin_min_amount_cashout' in paymentMethod ? paymentMethod.superadmin_min_amount_cashout : null)
        : ('superadmin_min_amount_purchase' in paymentMethod ? paymentMethod.superadmin_min_amount_purchase : null)
      : null;

  const superMaxRaw =
    scope === 'admin' && paymentMethod
      ? action === 'cashout'
        ? ('superadmin_max_amount_cashout' in paymentMethod ? paymentMethod.superadmin_max_amount_cashout : null)
        : ('superadmin_max_amount_purchase' in paymentMethod ? paymentMethod.superadmin_max_amount_purchase : null)
      : null;

  const superMin =
    superMinRaw != null && superMinRaw !== '' && !Number.isNaN(parseFloat(superMinRaw))
      ? parseFloat(superMinRaw)
      : null;
  const superMax =
    superMaxRaw != null && superMaxRaw !== '' && !Number.isNaN(parseFloat(superMaxRaw))
      ? parseFloat(superMaxRaw)
      : null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isLoading}
            disabled={isLoading}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {formatPaymentMethod(paymentMethod.payment_method_display || paymentMethod.payment_method)} - {actionLabel}{' '}
                {scope === 'superadmin' ? 'Superadmin Limits' : 'Amount Limits'}
              </p>
              {scope === 'superadmin' ? (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Configure the global minimum and maximum amounts allowed for{' '}
                  {actionLabel.toLowerCase()} transactions. Admins will only be able to set their own
                  limits within this range. Leave fields empty to remove global limits.
                </p>
              ) : (
                <>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Set the minimum and maximum amounts allowed for{' '}
                    {actionLabel.toLowerCase()} transactions using this payment method.
                    {superMin == null && superMax == null
                      ? ' Leave fields empty to remove limits.'
                      : ' Your limits must stay within the allowed range.'}
                  </p>
                  {(superMin != null || superMax != null) && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Allowed limits:{' '}
                      {superMin != null ? `min ${formatCurrencyLimit(superMin)}` : 'no minimum'}{' '}
                      · {superMax != null ? `max ${formatCurrencyLimit(superMax)}` : 'no maximum'}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div>
            <Input
              type="number"
              label={`Minimum ${actionLabel} Amount`}
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                if (errors.minAmount) {
                  setErrors((prev) => ({ ...prev, minAmount: undefined }));
                }
              }}
              placeholder="e.g., 5.00"
              step="0.01"
              min="0"
              error={errors.minAmount}
              disabled={isLoading}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Leave empty for no minimum limit
            </p>
          </div>

          <div>
            <Input
              type="number"
              label={`Maximum ${actionLabel} Amount`}
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                if (errors.maxAmount) {
                  setErrors((prev) => ({ ...prev, maxAmount: undefined }));
                }
              }}
              placeholder="e.g., 1000.00"
              step="0.01"
              min="0"
              error={errors.maxAmount}
              disabled={isLoading}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Leave empty for no maximum limit
            </p>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

