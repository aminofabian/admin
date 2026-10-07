import { formatCurrency } from '@/lib/utils/formatters';

/** Inclusive lower bound: 10% of the cashout amount. */
export const MIN_SEND_AMOUNT_RATIO = 0.1;
/** Inclusive upper bound: 110% of the cashout amount. */
export const MAX_SEND_AMOUNT_RATIO = 1.1;

const CENTS_PER_UNIT = 100;
const MIN_RATIO_DENOMINATOR = 10;
const MAX_RATIO_NUMERATOR = 11;
const PAYLOAD_FRACTION_DIGITS = 2;
const SEND_AMOUNT_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/;
const INVALID_SEND_AMOUNT_MESSAGE = 'Enter an amount with up to 2 decimal places.';
const MISSING_CASHOUT_AMOUNT_MESSAGE = 'Cashout amount is unavailable.';

export type SendAmountBounds = {
  min: number;
  max: number;
};

export type SendAmountValidation =
  | { ok: true; amount: number }
  | { ok: false; message: string };

function amountToCents(amount: number): number {
  return Math.round(amount * CENTS_PER_UNIT);
}

function centsToAmount(cents: number): number {
  return cents / CENTS_PER_UNIT;
}

function ceilDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator);
}

function parseCashoutAmount(amount: string | number): number | null {
  const value = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Smallest and largest cent amounts that stay inside 10%–110% of the cashout.
 * Bounds are rounded inward so a value shown in the field still passes
 * `>= 0.1 * amount` and `<= 1.1 * amount`.
 */
export function getSendAmountBounds(cashoutAmount: string | number): SendAmountBounds | null {
  const cashout = parseCashoutAmount(cashoutAmount);
  if (cashout == null) return null;

  const cashoutCents = amountToCents(cashout);
  const minCents = ceilDiv(cashoutCents, MIN_RATIO_DENOMINATOR);
  const maxCents = Math.floor((cashoutCents * MAX_RATIO_NUMERATOR) / MIN_RATIO_DENOMINATOR);
  if (minCents > maxCents) return null;

  return {
    min: centsToAmount(minCents),
    max: centsToAmount(maxCents),
  };
}

export function formatSendAmountInput(cashoutAmount: string | number): string {
  const cashout = parseCashoutAmount(cashoutAmount);
  if (cashout == null) return '';
  return cashout.toFixed(PAYLOAD_FRACTION_DIGITS);
}

export function formatSendAmountForPayload(amount: number): string {
  return amount.toFixed(PAYLOAD_FRACTION_DIGITS);
}

export function validateSendAmountInput(
  raw: string,
  cashoutAmount: string | number,
): SendAmountValidation {
  const trimmed = raw.trim();
  if (!SEND_AMOUNT_INPUT_PATTERN.test(trimmed)) {
    return { ok: false, message: INVALID_SEND_AMOUNT_MESSAGE };
  }

  const bounds = getSendAmountBounds(cashoutAmount);
  if (!bounds) {
    return { ok: false, message: MISSING_CASHOUT_AMOUNT_MESSAGE };
  }

  const sendCents = amountToCents(Number(trimmed));
  const minCents = amountToCents(bounds.min);
  const maxCents = amountToCents(bounds.max);
  if (sendCents < minCents || sendCents > maxCents) {
    return {
      ok: false,
      message: `Amount must be between ${formatCurrency(bounds.min)} and ${formatCurrency(bounds.max)}.`,
    };
  }

  return { ok: true, amount: centsToAmount(sendCents) };
}
