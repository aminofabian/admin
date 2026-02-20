'use client';

import { useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';

/** Reason options per balance type and action (credit = main, winning = winning). */
export const REASON_OPTIONS = {
  credit: {
    add: {
      free_play: 'Free Play',
      bonus_adjustment: 'Bonus Adjustment',
      credit_adjustment: 'Credit Adjustment',
    },
    deduct: {
      credit_adjustment: 'Credit Adjustment',
    },
  },
  winning: {
    add: {
      winning_adjustment: 'Winning Adjustment',
    },
    deduct: {
      winning_adjustment: 'Winning Adjustment',
      normal_flow: 'Normal Flow',
    },
  },
} as const;

type BalanceTypeKey = keyof typeof REASON_OPTIONS;
type ActionKey = 'add' | 'deduct';

/** Returns dropdown options for the current balance type (merged add + deduct, unique by key). */
function getReasonOptionsForBalanceType(
  balanceType: 'main' | 'winning',
): { value: string; label: string }[] {
  const key: BalanceTypeKey = balanceType === 'main' ? 'credit' : 'winning';
  const add = REASON_OPTIONS[key].add as Record<string, string>;
  const deduct = REASON_OPTIONS[key].deduct as Record<string, string>;
  const merged = { ...add, ...deduct };
  return Object.entries(merged).map(([value, label]) => ({ value, label }));
}

/** Returns whether the selected reason is valid for the given action. */
export function isReasonValidForAction(
  balanceType: 'main' | 'winning',
  action: 'add' | 'deduct',
  reason: string,
): boolean {
  if (!reason) return false;
  const key: BalanceTypeKey = balanceType === 'main' ? 'credit' : 'winning';
  const options = REASON_OPTIONS[key][action as ActionKey] as Record<string, string>;
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

const QUICK_AMOUNTS = [2, 3, 5, 7];

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

  // Clear reason when balance type changes so user must pick a reason valid for the new type
  useEffect(() => {
    setReason('');
  }, [balanceType, setReason]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/80"
        onClick={() => !isUpdating && onClose()}
        aria-hidden="true"
      />
      
      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[60] w-full sm:max-w-[420px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* Header — compact */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">Edit Balance</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Adjust player balance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200/80 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
              disabled={isUpdating}
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body — sections with consistent spacing */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-28">
            {/* Current balances */}
            <section className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current balance</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Credits</span>
                  </div>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrency(credits)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Winnings</span>
                  </div>
                  <p className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(winnings)}</p>
                </div>
              </div>
            </section>

            {/* Amount to adjust — stepper */}
            <section className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount to adjust</p>
              <div className="flex items-center justify-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => setBalanceValue((prev) => Math.max(0, prev - 1))}
                  className="h-10 w-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  disabled={isUpdating}
                  aria-label="Decrease"
                >
                  −
                </button>
                <div className="min-w-[4rem] text-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">${balanceValue}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBalanceValue((prev) => prev + 1)}
                  className="h-10 w-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  disabled={isUpdating}
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </section>

            {/* Quick amounts */}
            <section className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick amounts</p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    onClick={() => setBalanceValue(amount)}
                    className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors disabled:opacity-50"
                    disabled={isUpdating}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </section>

            {/* Manual amount */}
            <section className="space-y-2">
              <label htmlFor="edit-balance-manual" className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Manual amount
              </label>
              <Input
                id="edit-balance-manual"
                type="number"
                value={balanceValue === 0 ? '' : balanceValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setBalanceValue(0);
                  else setBalanceValue(Math.max(0, parseFloat(val) || 0));
                }}
                placeholder="0"
                className="h-9 text-sm"
                disabled={isUpdating}
                min={0}
                step={1}
                autoComplete="off"
              />
            </section>

            {/* Balance type */}
            <section className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Apply to</p>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                    balanceType === 'main'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="balanceType"
                    checked={balanceType === 'main'}
                    onChange={() => setBalanceType('main')}
                    className="h-4 w-4 text-green-500 border-gray-300 focus:ring-green-500 focus:ring-offset-0"
                    disabled={isUpdating}
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Credits</span>
                </label>
                <label
                  className={`flex items-center gap-2 cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                    balanceType === 'winning'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="balanceType"
                    checked={balanceType === 'winning'}
                    onChange={() => setBalanceType('winning')}
                    className="h-4 w-4 text-amber-500 border-gray-300 focus:ring-amber-500 focus:ring-offset-0"
                    disabled={isUpdating}
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Winnings</span>
                </label>
              </div>
            </section>

            {/* Reason */}
            <section className="space-y-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Reason
              </span>
              <Select
                value={reason}
                onChange={setReason}
                options={reasonOptions}
                placeholder="Select reason"
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </section>

            {/* Remarks */}
            <section className="space-y-2">
              <label htmlFor="edit-balance-remarks" className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Remarks
              </label>
              <textarea
                id="edit-balance-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes"
                rows={4}
                disabled={isUpdating}
                autoComplete="off"
                className="w-full min-h-[6rem] resize-y px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
            </section>
          </div>

          {/* Footer — compact actions */}
          <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onUpdate('decrease', reason, remarks)}
              disabled={isUpdating || balanceValue <= 0}
              isLoading={isUpdating}
              className="px-4 py-2 text-sm font-semibold"
            >
              Deduct
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUpdate('increase', reason, remarks)}
              disabled={isUpdating || balanceValue <= 0}
              isLoading={isUpdating}
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
