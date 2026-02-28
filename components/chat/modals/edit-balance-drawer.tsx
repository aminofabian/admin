'use client';

import { useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';

/** Reason options per balance type. Same reasons for both add and deduct. */
export const REASON_OPTIONS = {
  credit: {
    free_play: 'Free Play',
    manual: 'Manual',
  },
  winning: {
    manual: 'Manual',
    seize_tip: 'Seize/Tip',
  },
} as const;

type BalanceTypeKey = keyof typeof REASON_OPTIONS;

/** Returns dropdown options for the current balance type. */
function getReasonOptionsForBalanceType(
  balanceType: 'main' | 'winning',
): { value: string; label: string }[] {
  const key: BalanceTypeKey = balanceType === 'main' ? 'credit' : 'winning';
  const options = REASON_OPTIONS[key] as Record<string, string>;
  return Object.entries(options).map(([value, label]) => ({ value, label }));
}

/** Returns whether the selected reason is valid for the balance type (valid for both add and deduct). */
export function isReasonValidForAction(
  balanceType: 'main' | 'winning',
  _action: 'add' | 'deduct',
  reason: string,
): boolean {
  if (!reason) return false;
  const key: BalanceTypeKey = balanceType === 'main' ? 'credit' : 'winning';
  const options = REASON_OPTIONS[key] as Record<string, string>;
  return Object.prototype.hasOwnProperty.call(options, reason);
}

interface EditBalanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  credits?: string;
  winnings?: string;
  balanceValue: number;
  setBalanceValue: React.Dispatch<React.SetStateAction<number>>;
  balanceType: 'main' | 'winning';
  setBalanceType: React.Dispatch<React.SetStateAction<'main' | 'winning'>>;
  reason: string;
  setReason: React.Dispatch<React.SetStateAction<string>>;
  remarks: string;
  setRemarks: React.Dispatch<React.SetStateAction<string>>;
  isUpdating: boolean;
  onUpdate: (operation: 'increase' | 'decrease', reason: string, remarks: string) => void;
}

const QUICK_AMOUNTS = [2, 3, 5, 7, 10];

export function EditBalanceDrawer({
  isOpen,
  onClose,
  credits = '0',
  winnings = '0',
  balanceValue,
  setBalanceValue,
  balanceType,
  setBalanceType,
  reason,
  setReason,
  remarks,
  setRemarks,
  isUpdating,
  onUpdate,
}: EditBalanceDrawerProps) {
  const reasonOptions = getReasonOptionsForBalanceType(balanceType);
  const canAdd = isReasonValidForAction(balanceType, 'add', reason);
  const canDeduct = isReasonValidForAction(balanceType, 'deduct', reason);
  const isReady = reason && balanceValue > 0;
  const balanceLabel = balanceType === 'main' ? 'Credits' : 'Winnings';
  const currentBalance = balanceType === 'main' ? credits : winnings;

  // Clear reason when balance type changes
  useEffect(() => {
    setReason('');
  }, [balanceType, setReason]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isUpdating && onClose()}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[400px] flex-col bg-white shadow-xl dark:bg-gray-900 dark:shadow-black/40">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Adjust Balance</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Add or deduct from player balance
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                balanceType === 'main'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
              }`}
            >
              Adjusting: {balanceLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 disabled:opacity-50"
            disabled={isUpdating}
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — 1. Which balance → 2. Why → 3. How much → 4. Notes */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-40">
          {/* Step 1: Which balance (with current amounts) */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Which balance?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBalanceType('main')}
                disabled={isUpdating}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  balanceType === 'main'
                    ? 'border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-600'
                    : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40'
                }`}
              >
                <span className="text-xs font-medium uppercase tracking-wider opacity-90">Credits</span>
                <span className="text-sm font-bold tabular-nums">{formatCurrency(credits)}</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceType('winning')}
                disabled={isUpdating}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  balanceType === 'winning'
                    ? 'border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-600'
                    : 'border-gray-300 bg-white hover:border-amber-400 hover:bg-amber-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-amber-500 dark:hover:bg-amber-950/40'
                }`}
              >
                <span className="text-xs font-medium uppercase tracking-wider opacity-90">Winnings</span>
                <span className="text-sm font-bold tabular-nums">{formatCurrency(winnings)}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Reason */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Why is this balance changing?
            </label>
            <Select
              value={reason}
              onChange={setReason}
              options={reasonOptions}
              placeholder="Select a reason"
              disabled={isUpdating}
              className="h-10"
            />
            {!reason && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Choose a reason to enable Add / Deduct
              </p>
            )}
          </div>

          {/* Step 3: Amount — combined stepper, quick amounts, custom */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              How much? <span className="font-normal text-gray-500">(from {balanceLabel})</span>
            </p>
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setBalanceValue((prev) => Math.max(0, prev - 1))}
                  disabled={isUpdating}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-600 dark:hover:bg-gray-700"
                  aria-label="Decrease"
                >
                  −
                </button>
                <div className="flex flex-1 flex-col items-center">
                  <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    ${balanceValue}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setBalanceValue((prev) => prev + 1)}
                  disabled={isUpdating}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-600 dark:hover:bg-gray-700"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    onClick={() => setBalanceValue(amount)}
                    disabled={isUpdating}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      balanceValue === amount
                        ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <Input
                  type="number"
                  value={balanceValue === 0 ? '' : balanceValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') setBalanceValue(0);
                    else setBalanceValue(Math.max(0, parseFloat(val) || 0));
                  }}
                  placeholder="Or enter custom amount"
                  className="h-9 text-sm"
                  disabled={isUpdating}
                  min={0}
                  step={1}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Notes (optional) */}
          <div>
            <label
              htmlFor="edit-balance-remarks"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Notes <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id="edit-balance-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add internal notes for this adjustment..."
              rows={3}
              disabled={isUpdating}
              autoComplete="off"
              className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {/* Footer — sticky with summary */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
          {isReady && (
            <p className="mb-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              {balanceLabel}: {formatCurrency(currentBalance)} →{' '}
              {canAdd && canDeduct
                ? `Add or deduct $${balanceValue}`
                : canAdd
                  ? `Add $${balanceValue}`
                  : `Deduct $${balanceValue}`}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isUpdating}
              className="px-4"
            >
              Cancel
            </Button>
            {canDeduct && (
              <Button
                variant={canAdd ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => onUpdate('decrease', reason, remarks)}
                disabled={isUpdating || balanceValue <= 0}
                isLoading={isUpdating}
                className={
                  canAdd
                    ? 'px-4'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 px-4 hover:from-indigo-700 hover:to-violet-700'
                }
              >
                {balanceValue > 0 ? `Deduct $${balanceValue}` : 'Deduct'}
              </Button>
            )}
            {canAdd && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onUpdate('increase', reason, remarks)}
                disabled={isUpdating || balanceValue <= 0}
                isLoading={isUpdating}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 hover:from-indigo-700 hover:to-violet-700"
              >
                {balanceValue > 0 ? `Add $${balanceValue}` : 'Add'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
