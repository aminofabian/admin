'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input } from '@/components/ui';
import { usePlayerRouletteSpinInfo } from '@/hooks/use-player-roulette-spin-info';
import type { PlayerSpinBalanceAdjustmentType } from '@/lib/api/roulette-player-spin-balances';

interface EditSpinsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: number;
  adjustmentType: PlayerSpinBalanceAdjustmentType;
  setAdjustmentType: React.Dispatch<React.SetStateAction<PlayerSpinBalanceAdjustmentType>>;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  reason: string;
  setReason: React.Dispatch<React.SetStateAction<string>>;
  isUpdating: boolean;
  onPrimaryAction: () => void;
}

const QUICK_QUANTITIES = [1, 3, 5, 10];

export function EditSpinsDrawer({
  isOpen,
  onClose,
  playerId,
  adjustmentType,
  setAdjustmentType,
  quantity,
  setQuantity,
  reason,
  setReason,
  isUpdating,
  onPrimaryAction,
}: EditSpinsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const { spinInfo, isLoading, error, refresh } = usePlayerRouletteSpinInfo(isOpen ? playerId : null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void refresh();
    }
  }, [isOpen, refresh]);

  const spinBalance = spinInfo?.spin_balance ?? 0;
  const isUnlimited = Boolean(spinInfo?.is_unlimited);

  const primaryLabel = useMemo(() => {
    if (quantity <= 0) {
      return adjustmentType === 'add' ? 'Add' : 'Deduct';
    }
    return adjustmentType === 'add' ? `Add ${quantity}` : `Deduct ${quantity}`;
  }, [adjustmentType, quantity]);

  const amountBlocked = quantity <= 0;
  const reasonBlocked = !reason.trim();
  const primaryDisabled = isUpdating || amountBlocked || reasonBlocked || isUnlimited;

  if (!isOpen || !mounted) return null;

  const drawer = (
    <div
      className="fixed inset-0 z-[120] overflow-hidden max-lg:top-16 max-lg:bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spin-adjustment-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70"
        onClick={() => !isUpdating && onClose()}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 flex w-full flex-col bg-white shadow-xl dark:bg-gray-900 dark:shadow-black/40 lg:left-auto lg:right-0 lg:max-w-[400px] lg:border-l lg:border-gray-200 dark:lg:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              aria-label="Close spin adjustment"
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="min-w-0 flex-1">
              <h2 id="spin-adjustment-title" className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
                Spin adjustment
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hidden shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:block"
              disabled={isUpdating}
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Prize wheel spins
              </p>
              {isLoading ? (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              ) : error ? (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
              ) : isUnlimited ? (
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">Unlimited</p>
              ) : (
                <>
                  <p className="mt-2 text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{spinBalance}</p>
                  {spinInfo ? (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {spinInfo.remaining_spins ?? 0} ready now · {spinInfo.used_spins ?? 0} used today
                    </p>
                  ) : null}
                </>
              )}
            </div>

            {isUnlimited ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This player has unlimited prize wheel spins. Manual spin adjustments are not available.
              </p>
            ) : (
              <>
                <div className="mb-5">
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment type</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setAdjustmentType('add')}
                      className={`rounded-lg border px-3 py-2.5 text-left transition-all disabled:opacity-50 ${
                        adjustmentType === 'add'
                          ? 'border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-600'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
                      }`}
                    >
                      <span className="block text-sm font-semibold">Add</span>
                      <span
                        className={`mt-0.5 block text-xs ${
                          adjustmentType === 'add' ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        Increase the player&apos;s stored spin balance.
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setAdjustmentType('deduct')}
                      className={`rounded-lg border px-3 py-2.5 text-left transition-all disabled:opacity-50 ${
                        adjustmentType === 'deduct'
                          ? 'border-rose-500 bg-rose-500 text-white dark:border-rose-400 dark:bg-rose-600'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
                      }`}
                    >
                      <span className="block text-sm font-semibold">Deduct</span>
                      <span
                        className={`mt-0.5 block text-xs ${
                          adjustmentType === 'deduct' ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        Decrease the player&apos;s stored spin balance.
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Spins</p>
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
                    <div className="flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.max(0, prev - 1))}
                        disabled={isUpdating}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-600 dark:hover:bg-gray-700"
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <div className="flex flex-1 flex-col items-center">
                        <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          {quantity}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          spin{quantity === 1 ? '' : 's'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => prev + 1)}
                        disabled={isUpdating}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-600 dark:hover:bg-gray-700"
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {QUICK_QUANTITIES.map((amount) => (
                        <button
                          type="button"
                          key={amount}
                          onClick={() => setQuantity(amount)}
                          disabled={isUpdating}
                          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                            quantity === amount
                              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                              : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Input
                        type="number"
                        value={quantity === 0 ? '' : quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') setQuantity(0);
                          else setQuantity(Math.max(0, parseInt(val, 10) || 0));
                        }}
                        placeholder="Custom amount"
                        className="h-9 text-sm"
                        disabled={isUpdating}
                        min={0}
                        step={1}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="edit-spins-reason"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Reason
                  </label>
                  <textarea
                    id="edit-spins-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Customer support credit"
                    rows={3}
                    disabled={isUpdating}
                    autoComplete="off"
                    className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </>
            )}
          </div>

          {!isUnlimited ? (
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-5">
              {!amountBlocked && (
                <p className="mb-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  {adjustmentType === 'add'
                    ? `Adds ${quantity} spin${quantity === 1 ? '' : 's'} to the prize wheel balance`
                    : `Removes ${quantity} spin${quantity === 1 ? '' : 's'} from the prize wheel balance`}
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={isUpdating} className="px-4">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onPrimaryAction}
                  disabled={primaryDisabled}
                  isLoading={isUpdating}
                  className={
                    adjustmentType === 'deduct'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 px-4 hover:from-rose-700 hover:to-rose-800'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 px-4 hover:from-indigo-700 hover:to-violet-700'
                  }
                >
                  {primaryLabel}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
}
