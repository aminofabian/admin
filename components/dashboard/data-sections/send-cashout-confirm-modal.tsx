'use client';

import { useEffect, useState } from 'react';
import { ConfirmModal, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  formatSendAmountInput,
  getSendAmountBounds,
  validateSendAmountInput,
} from '@/lib/utils/send-amount';

interface SendCashoutConfirmModalProps {
  isOpen: boolean;
  cashoutAmount: string;
  providerLabel: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (sendAmount: number) => void;
}

export function SendCashoutConfirmModal({
  isOpen,
  cashoutAmount,
  providerLabel,
  isLoading = false,
  onClose,
  onConfirm,
}: SendCashoutConfirmModalProps) {
  const [amountInput, setAmountInput] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAmountInput(formatSendAmountInput(cashoutAmount));
    setShowError(false);
  }, [isOpen, cashoutAmount]);

  const bounds = getSendAmountBounds(cashoutAmount);
  const validation = validateSendAmountInput(amountInput, cashoutAmount);
  const rangeLabel = bounds
    ? `${formatCurrency(bounds.min)} – ${formatCurrency(bounds.max)}`
    : null;

  const handleConfirm = () => {
    setShowError(true);
    if (!validation.ok || isLoading) return;
    onConfirm(validation.amount);
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={`Send to ${providerLabel}`}
      description={`This cashout is ${formatCurrency(cashoutAmount || '0')}. Enter the exact amount to send after processor fees or other deductions.`}
      confirmText={`Send to ${providerLabel}`}
      cancelText="Go Back"
      variant="info"
      isLoading={isLoading}
    >
      <Input
        label="Amount to send"
        aria-label="Amount to send"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={amountInput}
        disabled={isLoading}
        error={showError && !validation.ok ? validation.message : undefined}
        onChange={(event) => setAmountInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          handleConfirm();
        }}
      />
      {rangeLabel ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Must be between {rangeLabel} (10% to 110% of the cashout).
        </p>
      ) : null}
    </ConfirmModal>
  );
}
