/** Shared helpers for admin UI when cashout 24h limit blocks an action.
 * Money values from the API are two-decimal strings — compare/display via integer cents.
 */

export const CASHOUT_24H_LIMIT_EXCEEDED = 'cashout_24h_limit_exceeded';

export type Cashout24hLimitExceededPayload = {
  code?: string;
  message?: string;
  error?: string;
  requested_amount?: string;
  cashout_24h_limit?: string | null;
  cashout_24h_limit_source?: string;
  cashout_24h_completed_amount?: string;
  cashout_24h_reserved_amount?: string;
  cashout_24h_remaining_amount?: string | null;
};

export function isCashout24hLimitExceeded(
  payload: unknown,
): payload is Cashout24hLimitExceededPayload & { code: typeof CASHOUT_24H_LIMIT_EXCEEDED } {
  if (!payload || typeof payload !== 'object') return false;
  return (payload as { code?: unknown }).code === CASHOUT_24H_LIMIT_EXCEEDED;
}

/** Parse a two-decimal money string to integer cents. Returns null if invalid/empty. */
export function moneyToCents(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  if (raw === '') return null;
  const match = raw.match(/^(-?)(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) {
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  }
  const sign = match[1] === '-' ? -1 : 1;
  const whole = Number.parseInt(match[2], 10);
  const frac = (match[3] ?? '').padEnd(2, '0').slice(0, 2);
  const cents = whole * 100 + Number.parseInt(frac || '0', 10);
  return sign * cents;
}

export function centsToMoneyString(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

function formatUsd(value: unknown): string {
  const cents = moneyToCents(value);
  if (cents === null) {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }
  const str = centsToMoneyString(cents);
  const n = Number.parseFloat(str);
  if (!Number.isFinite(n)) return str;
  return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}

function sourceLabel(source: string | undefined): string {
  if (source === 'player_override') return 'Player override';
  if (source === 'company_default') return 'Company default';
  if (source === 'unlimited') return 'Unlimited';
  return source ? source.replace(/_/g, ' ') : '';
}

/** Advise admins to leave the request pending and retry later. */
export function cashout24hExceededAdminMessage(
  payload: Cashout24hLimitExceededPayload,
): string {
  const parts = [
    'Cashout 24-hour limit exceeded. Leave this request pending and retry later.',
  ];
  if (payload.requested_amount != null) {
    parts.push(`Requested: ${formatUsd(payload.requested_amount)}.`);
  }
  if (payload.cashout_24h_limit != null) {
    parts.push(`Limit: ${formatUsd(payload.cashout_24h_limit)}.`);
  } else if (payload.cashout_24h_remaining_amount == null) {
    parts.push('Limit: Unlimited.');
  }
  const source = sourceLabel(payload.cashout_24h_limit_source);
  if (source) {
    parts.push(`Source: ${source}.`);
  }
  if (payload.cashout_24h_completed_amount != null) {
    parts.push(`Completed (24h): ${formatUsd(payload.cashout_24h_completed_amount)}.`);
  }
  if (payload.cashout_24h_reserved_amount != null) {
    parts.push(`Currently processing: ${formatUsd(payload.cashout_24h_reserved_amount)}.`);
  }
  if (payload.cashout_24h_remaining_amount != null) {
    parts.push(`Available now: ${formatUsd(payload.cashout_24h_remaining_amount)}.`);
  }
  return parts.join(' ');
}

export function isProcessingCashoutStatus(status: string | undefined | null): boolean {
  return (status ?? '').toLowerCase() === 'processing';
}
