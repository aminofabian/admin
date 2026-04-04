'use client';

import { useEffect, useMemo } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  parseLedgerAmount,
  validateExternalCashoutAmount,
  type ManualAdjustmentKind,
} from '@/lib/api/manual-adjustment-payload';
import { hasMeaningfulWinningBalance } from '@/lib/chat/map-chat-api';

export type { ManualAdjustmentKind };

const ADJUSTMENT_OPTIONS: {
  kind: ManualAdjustmentKind;
  title: string;
  description: string;
  direction: 'add' | 'deduct';
}[] = [
  {
    kind: 'freeplay',
    title: 'Freeplay',
    description: 'Add only: increases balance. Cashout limit unchanged.',
    direction: 'add',
  },
  {
    kind: 'external_deposit',
    title: 'External deposit',
    description: 'Add only: record funds received outside the site. Cashout limit unchanged.',
    direction: 'add',
  },
  {
    kind: 'external_cashout',
    title: 'External cashout',
    description:
      'Deduct only: record payout outside the site. Amount must be ≤ cashout limit and ≤ balance; both decrease.',
    direction: 'deduct',
  },
  {
    kind: 'void',
    title: 'Void',
    description:
      'Deduct only: no real money paid out (rule breaking, fraud, scam, tips, penalties, corrections). Locked balance reduced first; cashout limit only if locked is insufficient.',
    direction: 'deduct',
  },
];

/** Matches history/analytics void reason taxonomy (6.4). */
export const VOID_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'rule_breaking', label: 'Rule breaking' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'scam', label: 'Scam' },
  { value: 'tips', label: 'Tips' },
  { value: 'penalties', label: 'Penalties' },
  { value: 'corrections', label: 'Corrections' },
  { value: 'other', label: 'Other (use notes)' },
];

interface EditBalanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  credits?: string;
  winnings?: string;
  cashoutLimit?: string;
  lockedBalance?: string;
  adjustmentKind: ManualAdjustmentKind;
  setAdjustmentKind: React.Dispatch<React.SetStateAction<ManualAdjustmentKind>>;
  voidReasonCode: string;
  setVoidReasonCode: React.Dispatch<React.SetStateAction<string>>;
  balanceValue: number;
  setBalanceValue: React.Dispatch<React.SetStateAction<number>>;
  remarks: string;
  setRemarks: React.Dispatch<React.SetStateAction<string>>;
  isUpdating: boolean;
  onPrimaryAction: () => void;
}

const QUICK_AMOUNTS = [2, 3, 5, 7, 10];

export function EditBalanceDrawer({
  isOpen,
  onClose,
  credits = '0',
  winnings,
  cashoutLimit,
  lockedBalance,
  adjustmentKind,
  setAdjustmentKind,
  voidReasonCode,
  setVoidReasonCode,
  balanceValue,
  setBalanceValue,
  remarks,
  setRemarks,
  isUpdating,
  onPrimaryAction,
}: EditBalanceDrawerProps) {
  const meta = useMemo(
    () => ADJUSTMENT_OPTIONS.find((o) => o.kind === adjustmentKind) ?? ADJUSTMENT_OPTIONS[0],
    [adjustmentKind],
  );

  const limitNum = parseLedgerAmount(cashoutLimit);
  const lockedNum = parseLedgerAmount(lockedBalance);

  const externalCashoutValidation =
    adjustmentKind === 'external_cashout' && balanceValue > 0
      ? validateExternalCashoutAmount(balanceValue, cashoutLimit, credits)
      : ({ ok: true } as const);

  const voidBlocked = adjustmentKind === 'void' && !voidReasonCode;
  const amountBlocked = balanceValue <= 0;
  const externalCashoutBlocked =
    adjustmentKind === 'external_cashout' && !externalCashoutValidation.ok;
  const primaryDisabled =
    isUpdating || amountBlocked || externalCashoutBlocked || voidBlocked;

  useEffect(() => {
    setVoidReasonCode('');
  }, [adjustmentKind, setVoidReasonCode]);

  const primaryLabel = useMemo(() => {
    if (amountBlocked) {
      return meta.direction === 'add' ? 'Add' : 'Deduct';
    }
    if (meta.direction === 'add') {
      return `Add $${balanceValue}`;
    }
    return `Deduct $${balanceValue}`;
  }, [balanceValue, meta.direction, amountBlocked]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isUpdating && onClose()}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[400px] flex-col bg-white shadow-xl dark:bg-gray-900 dark:shadow-black/40">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Manual adjustment</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Freeplay, external deposit, external cashout, or void — per admin adjustment policy
            </p>
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

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-44">
          <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/40">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Player balances
            </p>
            <div
              className={`mt-2 grid gap-2 text-sm ${hasMeaningfulWinningBalance(winnings) ? 'grid-cols-2' : 'grid-cols-1'}`}
            >
              <div>
                <span className="text-gray-500 dark:text-gray-400">Balance</span>
                <p className="font-bold tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(credits)}</p>
              </div>
              {hasMeaningfulWinningBalance(winnings) ? (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Winnings</span>
                  <p className="font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatCurrency(winnings || '0')}
                  </p>
                </div>
              ) : null}
            </div>
            {(cashoutLimit !== undefined && cashoutLimit !== '') || (lockedBalance !== undefined && lockedBalance !== '') ? (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3 text-xs dark:border-gray-600">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Cashout limit</span>
                  <p className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {limitNum !== null ? formatCurrency(cashoutLimit ?? '0') : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Locked balance</span>
                  <p className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {lockedNum !== null ? formatCurrency(lockedBalance ?? '0') : '—'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment type</p>
            <div className="grid grid-cols-1 gap-2">
              {ADJUSTMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  disabled={isUpdating}
                  onClick={() => setAdjustmentKind(opt.kind)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-all disabled:opacity-50 ${
                    adjustmentKind === opt.kind
                      ? opt.direction === 'add'
                        ? 'border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-600'
                        : 'border-rose-500 bg-rose-500 text-white dark:border-rose-400 dark:bg-rose-600'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="block text-sm font-semibold">{opt.title}</span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      adjustmentKind === opt.kind ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {adjustmentKind === 'void' && (
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Void reason <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <Select
                value={voidReasonCode}
                onChange={setVoidReasonCode}
                options={VOID_REASON_OPTIONS}
                placeholder="Select reason"
                disabled={isUpdating}
                className="h-10"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Transaction history: Deduct · Void, with this reason. Analytics: Void. Balance decreases;
                locked balance first, then cashout limit only if locked is not enough.
              </p>
            </div>
          )}

          <div className="mb-5">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Amount</p>
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
                  placeholder="Custom amount"
                  className="h-9 text-sm"
                  disabled={isUpdating}
                  min={0}
                  step={1}
                  autoComplete="off"
                />
              </div>
              {adjustmentKind === 'external_cashout' &&
                !externalCashoutValidation.ok &&
                externalCashoutValidation.reason === 'limit_unknown' && (
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Cashout limit must be known before external cashout (amount ≤ limit). Refresh player data or
                    reopen chat.
                  </p>
                )}
              {adjustmentKind === 'external_cashout' &&
                !externalCashoutValidation.ok &&
                externalCashoutValidation.reason === 'exceeds_limit' && (
                  <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                    External cashout cannot exceed cashout limit ({formatCurrency(cashoutLimit ?? '0')}).
                  </p>
                )}
              {adjustmentKind === 'external_cashout' &&
                !externalCashoutValidation.ok &&
                externalCashoutValidation.reason === 'exceeds_balance' && (
                  <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                    Amount cannot exceed the player&apos;s balance ({formatCurrency(credits)}).
                  </p>
                )}
            </div>
          </div>

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
              placeholder="Internal notes…"
              rows={3}
              disabled={isUpdating}
              autoComplete="off"
              className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
          {!amountBlocked && (
            <p className="mb-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              {adjustmentKind === 'freeplay' &&
                `Adds freeplay · Balance +$${balanceValue} · Cashout limit unchanged`}
              {adjustmentKind === 'external_deposit' &&
                `Adds external deposit · Balance +$${balanceValue} · Cashout limit unchanged`}
              {adjustmentKind === 'external_cashout' &&
                `External cashout · Balance −$${balanceValue} · Cashout limit decreases by the same amount (when allowed)`}
              {adjustmentKind === 'void' &&
                `Void · Balance −$${balanceValue} · Locked reduced first; cashout limit only if needed`}
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
                meta.direction === 'deduct'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 px-4 hover:from-rose-700 hover:to-rose-800'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 px-4 hover:from-indigo-700 hover:to-violet-700'
              }
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
