'use client';

import { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';

interface GameRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  onConfirm: (amount: number) => Promise<void>;
  isSubmitting: boolean;
}

export function GameRechargeModal({
  isOpen,
  onClose,
  gameTitle,
  onConfirm,
  isSubmitting,
}: GameRechargeModalProps) {
  const [amountRaw, setAmountRaw] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmountRaw('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amount = parseFloat(amountRaw);
  const amountValid = Number.isFinite(amount) && amount > 0;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden
      />
      <div className="relative mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recharge game</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Amount to add to <span className="font-medium text-gray-900 dark:text-gray-100">{gameTitle}</span>
        </p>
        <div className="mt-4">
          <label htmlFor="recharge-amount" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount (USD)
          </label>
          <Input
            id="recharge-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
            className="w-full"
            autoComplete="off"
          />
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          The request is processed in the background. You can track it in game activity queues.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!amountValid || isSubmitting}
            isLoading={isSubmitting}
            onClick={async () => {
              if (!amountValid) return;
              await onConfirm(amount);
            }}
          >
            Submit recharge
          </Button>
        </div>
      </div>
    </div>
  );
}
