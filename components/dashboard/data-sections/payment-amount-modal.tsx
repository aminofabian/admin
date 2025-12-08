'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PaymentMethod, PaymentMethodAction } from '@/types';

interface PaymentAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: PaymentMethod | null;
  action: PaymentMethodAction;
  onSave: (minAmount: number | null, maxAmount: number | null) => Promise<void>;
  isLoading?: boolean;
}

export function PaymentAmountModal({
  isOpen,
  onClose,
  paymentMethod,
  action,
  onSave,
  isLoading = false,
}: PaymentAmountModalProps) {
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [errors, setErrors] = useState<{ minAmount?: string; maxAmount?: string }>({});

  useEffect(() => {
    if (paymentMethod && isOpen) {
      const minField = action === 'cashout' ? 'min_amount_cashout' : 'min_amount_purchase';
      const maxField = action === 'cashout' ? 'max_amount_cashout' : 'max_amount_purchase';
      
      setMinAmount(paymentMethod[minField] || '');
      setMaxAmount(paymentMethod[maxField] || '');
      setErrors({});
    }
  }, [paymentMethod, action, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: { minAmount?: string; maxAmount?: string } = {};

    if (minAmount.trim() !== '') {
      const min = parseFloat(minAmount);
      if (isNaN(min) || min < 0) {
        newErrors.minAmount = 'Minimum amount must be a valid positive number';
      }
    }

    if (maxAmount.trim() !== '') {
      const max = parseFloat(maxAmount);
      if (isNaN(max) || max < 0) {
        newErrors.maxAmount = 'Maximum amount must be a valid positive number';
      }
    }

    if (minAmount.trim() !== '' && maxAmount.trim() !== '') {
      const min = parseFloat(minAmount);
      const max = parseFloat(maxAmount);
      if (!isNaN(min) && !isNaN(max) && min > max) {
        newErrors.maxAmount = 'Maximum amount must be greater than or equal to minimum amount';
      }
    }

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
  const title = `Edit ${actionLabel} Amounts - ${paymentMethod.payment_method_display}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
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
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set the minimum and maximum amounts allowed for {actionLabel.toLowerCase()} transactions using this payment method.
          Leave fields empty to remove limits.
        </p>

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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave empty for no maximum limit
          </p>
        </div>
      </div>
    </Modal>
  );
}

