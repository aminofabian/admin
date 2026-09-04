/** Shared helpers for admin UI when cashout 24h limit blocks an action. */

export const CASHOUT_24H_LIMIT_EXCEEDED = 'cashout_24h_limit_exceeded';

export type Cashout24hLimitExceededPayload = {
  code?: string;
  message?: string;
  error?: string;
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

function formatUsd(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return String(value);
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
