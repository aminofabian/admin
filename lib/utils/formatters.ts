import type { Transaction } from '@/types';

/**
 * Utility function to merge class names
 * Simple implementation without external dependencies
 */
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}

export const formatCurrency = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numAmount);
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === '') {
    return 'N/A';
  }

  if (dateString === 'null' || dateString === 'undefined' || dateString === 'Invalid Date') {
    return 'N/A';
  }

  let date: Date;

  const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const match = dateString.match(ddmmyyyyPattern);

  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  } else if (dateString.includes('T')) {
    date = new Date(dateString);
  } else if (dateString.includes('-')) {
    date = new Date(dateString + 'T00:00:00Z');
  } else if (dateString.includes('/')) {
    date = new Date(dateString);
  } else {
    const timestamp = parseInt(dateString);
    if (!isNaN(timestamp)) {
      date = new Date(timestamp);
    } else {
      date = new Date(dateString);
    }
  }

  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'N/A';
  }

  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);

    if (!formatted || formatted === 'Invalid Date') {
      throw new Error('Intl.DateTimeFormat returned invalid result');
    }

    return formatted;
  } catch (error) {
    console.warn('Intl.DateTimeFormat failed, using fallback:', error);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear();
    const month = months[date.getMonth()];
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${month} ${day}, ${year}, ${hours}:${minutes}:${seconds}`;
  }
};

function findPaymentDetailValue(
  paymentDetails: Record<string, unknown>,
  keys: string[]
): unknown {
  const keySet = new Set(keys.map((k) => k.toLowerCase()));
  for (const [key, value] of Object.entries(paymentDetails)) {
    if (keySet.has(key.toLowerCase())) return value;
  }
  return undefined;
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

/** Format a raw phone string (e.g. "11234566785") to readable form (e.g. "+1 (123) 456-6785"). */
export function formatPhoneNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 0) return '—';
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length >= 10) {
    return `+${digits.slice(0, -10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
  }
  return digits;
}

function pickValue(paymentDetails: Record<string, unknown>, keys: string[]): string {
  const val = findPaymentDetailValue(paymentDetails, keys);
  const formatted = formatDetailValue(val);
  return formatted !== '—' && String(formatted).trim() !== '' ? formatted : '';
}

const PLAYER_IP_KEYS = ['binpay_player_ip_address', 'player_ip_address', 'player_ip'];

/**
 * Extract the player's IP address from a transaction for use when sending to Binpay/Tierlock.
 * Checks payment_details first, then top-level fields. Used to send the correct player IP
 * (instead of admin/proxy IP) when admins click "Send to Binpay" etc.
 */
export function getPlayerIpFromTransaction(
  transaction: Pick<Transaction, 'payment_details'>
): string | null {
  const pd = transaction.payment_details;
  if (pd && typeof pd === 'object') {
    const val = findPaymentDetailValue(pd, PLAYER_IP_KEYS);
    if (val != null && String(val).trim() !== '') return String(val).trim();
  }
  const tx = transaction as Record<string, unknown>;
  for (const key of PLAYER_IP_KEYS) {
    const val = tx[key];
    if (val != null && String(val).trim() !== '') return String(val).trim();
  }
  return null;
}

const EMAIL_KEYS = ['email', 'paypal_email', 'user_email', 'payer_email', 'customer_email'];
const PHONE_KEYS = ['phone', 'phone_number', 'phonenumber', 'mobile_number', 'mobile'];

/**
 * Extract email and/or phone from a transaction for use when sending to BinPay/Tierlock/Taparcadia.
 * BinPay requires username to be a valid email or 10-digit phone number.
 */
export function getEmailOrPhoneFromTransaction(
  transaction: Pick<Transaction, 'user_email' | 'payment_details'>
): { email?: string; phone?: string } {
  const result: { email?: string; phone?: string } = {};

  // Prefer transaction-level user_email
  const txEmail = transaction.user_email;
  if (txEmail && typeof txEmail === 'string' && txEmail.trim() !== '') {
    result.email = txEmail.trim();
  }

  const pd = transaction.payment_details;
  if (pd && typeof pd === 'object') {
    if (!result.email) {
      const emailVal = findPaymentDetailValue(pd, EMAIL_KEYS);
      if (emailVal != null && typeof emailVal === 'string' && emailVal.trim() !== '') {
        result.email = emailVal.trim();
      }
    }
    const phoneVal = findPaymentDetailValue(pd, PHONE_KEYS);
    if (phoneVal != null) {
      const phoneStr = String(phoneVal).replace(/\D/g, '');
      if (phoneStr.length >= 10) {
        result.phone = phoneStr.slice(-10);
      }
    }
  }

  return result;
}

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const s = value.trim();
  return s.length > 0 && SIMPLE_EMAIL_RE.test(s);
}

/**
 * Resolves email/phone and BinPay `username` (email or 10-digit phone).
 * Uses player profile overrides when provided (from GET /api/v1/players/{id}/).
 */
export function resolvePayoutContactFromTransaction(
  transaction: Pick<Transaction, 'user_email' | 'user_username' | 'payment_details'>,
  playerOverride?: { email?: string; phone?: string }
): {
  userEmail?: string;
  userPhone?: string;
  binpayUsername?: string;
} {
  const base = getEmailOrPhoneFromTransaction(transaction);
  let email = base.email && isValidEmail(base.email) ? base.email.trim() : undefined;
  if (!email && transaction.user_username && isValidEmail(transaction.user_username)) {
    email = transaction.user_username.trim();
  }
  if (playerOverride?.email?.trim()) {
    const pe = playerOverride.email.trim();
    if (isValidEmail(pe)) email = pe;
  }
  let phone = base.phone;
  if (playerOverride?.phone && /^\d{10}$/.test(playerOverride.phone)) {
    phone = playerOverride.phone;
  }

  if (email && !isValidEmail(email)) {
    email = undefined;
  }

  let binpayUsername: string | undefined;
  if (email && isValidEmail(email)) {
    binpayUsername = email;
  } else if (phone && /^\d{10}$/.test(phone)) {
    binpayUsername = phone;
  }

  return {
    userEmail: email,
    userPhone: phone,
    binpayUsername,
  };
}

/**
 * Get at most 2 user-identifying payment details for display.
 * Prioritizes: Email, Name, Username, Phone, Cashtag/ChimeSign, Wallet.
 */
const IDENTITY_PRIORITY: [string, string[]][] = [
  ['Email', ['email', 'paypal_email', 'user_email', 'payer_email', 'customer_email']],
  ['Name', ['full_name', 'fullname', 'customer_name', 'customername', 'account_name', 'accountName']],
  ['Username', ['username', 'venmo_username', 'venmo_handle', 'venmo_user', 'user_name']],
  ['Phone', ['phone', 'phone_number', 'phonenumber']],
  ['Cashtag', ['cashtag', 'cash_tag', 'chimetag', 'chimesign', 'chime_sign']],
  ['Wallet', ['wallet_address', 'wallet', 'crypto_address', 'address', 'destination']],
  ['Player IP', ['binpay_player_ip_address', 'player_ip_address', 'player_ip']],
];

const CARD_TAIL_KEYS = [
  'masked_card',
  'maskedcard',
  'card_last4',
  'card_last_4',
  'last4',
  'card_tail',
  'card_tail4',
  'card_last_four',
  'card_number_last4',
];
const CARD_NAME_KEYS = [
  'cardholder_name',
  'name_on_card',
  'card_name',
  'card_holder_name',
  'holder_name',
  'cardholder',
  'card_holder',
];

const VENMO_USERNAME_KEYS = [
  'venmo_username',
  'venmo_handle',
  'venmo_handle_name',
  'venmo_user',
  'venmo_id',
  'username',
  'handle',
];

/** @-prefixed when value looks like a bare Venmo handle. */
function formatVenmoHandleForDisplay(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (s.startsWith('@')) return s;
  if (/^[\w.-]+$/.test(s)) return `@${s}`;
  return s;
}

/**
 * Card line for payment details: show like ****7887, not bare 7887.
 * Keeps API-supplied masks (e.g. **** **** **** 7887); bare digits → **** + last4.
 */
function formatCardDetailsForDisplay(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  if (/[*•·xX]/.test(s)) {
    return s;
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `****${digits.slice(-4)}`;
  }
  return undefined;
}

function extractCardName(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const s = value.trim();
    return s ? s : undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
}

function pickTopTwoIdentifiers(paymentDetails: Record<string, unknown>): [string, string][] {
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (const [label, keys] of IDENTITY_PRIORITY) {
    const v = pickValue(paymentDetails, keys);
    if (v && !seen.has(v)) {
      seen.add(v);
      const displayValue = label === 'Phone' ? formatPhoneNumber(v) : v;
      out.push([label, displayValue]);
      if (out.length >= 2) break;
    }
  }
  return out;
}

/** Fallback when no identity fields: Provider + Payment Method. */
function getProviderPaymentMethodFallback(transaction: {
  payment_method?: string | null;
  provider?: string | null;
  payment_details?: Record<string, unknown> | null;
}): [string, string][] {
  const out: [string, string][] = [];
  const provider = transaction.provider ?? (transaction.payment_details && typeof transaction.payment_details === 'object'
    ? findPaymentDetailValue(transaction.payment_details, ['provider'])
    : null);
  const providerStr = formatDetailValue(provider);
  const methodStr = formatDetailValue(transaction.payment_method);
  if (providerStr !== '—' && String(providerStr).trim() !== '') out.push(['Provider', providerStr]);
  if (methodStr !== '—' && String(methodStr).trim() !== '') out.push(['Method', methodStr]);
  return out.slice(0, 2);
}

function resolvePaymentMethod(transaction: {
  payment_details?: Record<string, unknown> | null;
  payment_method?: string | null;
}): string | null | undefined {
  if (transaction.payment_method != null && String(transaction.payment_method).trim() !== '') {
    return transaction.payment_method;
  }
  const pd = transaction.payment_details;
  if (pd && typeof pd === 'object') {
    const val = findPaymentDetailValue(pd, ['payment_method', 'method', 'payment_method_type']);
    return val != null ? String(val) : undefined;
  }
  return undefined;
}

/** Provider status config: [displayLabel, possible API keys]. */
const PROVIDER_STATUS_KEYS: [string, string[]][] = [
  ['Binpay status', ['binpay_status', 'binpayStatus']],
  ['Tierlock status', ['tierlock_status', 'tierlockStatus']],
];

function getProviderStatusEntries(
  transaction: Pick<Transaction, 'payment_details' | 'binpay_status' | 'tierlock_status' | 'taparcadia_status'>
): [string, string][] {
  const out: [string, string][] = [];
  const tx = transaction as Record<string, unknown>;
  const pd = transaction.payment_details && typeof transaction.payment_details === 'object'
    ? transaction.payment_details
    : null;

  for (const [label, keys] of PROVIDER_STATUS_KEYS) {
    let val: unknown = null;
    for (const key of keys) {
      val = tx[key] ?? (pd && typeof pd === 'object' ? (pd as Record<string, unknown>)[key] : undefined);
      if (val != null && String(val).trim() !== '') break;
    }
    const str = formatDetailValue(val);
    if (str !== '—' && String(str).trim() !== '') {
      out.push([label, str]);
    }
  }
  return out;
}

/** Accepts Transaction or any object with the payment-related fields we need. */
export function getPaymentDetailsForDisplay(
  transaction: Pick<
    Transaction,
    | 'payment_details'
    | 'payment_method'
    | 'provider'
    | 'binpay_status'
    | 'tierlock_status'
    | 'taparcadia_status'
    | 'user_username'
  >
): [string, string][] {
  const paymentDetails = transaction.payment_details;
  let entries: [string, string][];

  if (paymentDetails && typeof paymentDetails === 'object') {
    entries = pickTopTwoIdentifiers(paymentDetails);
    if (entries.length === 0) entries = getProviderPaymentMethodFallback(transaction);
  } else {
    entries = getProviderPaymentMethodFallback(transaction);
  }

  const resolvedMethod = resolvePaymentMethod(transaction);
  const methodStr = formatDetailValue(resolvedMethod);
  const hasMethod = methodStr !== '—' && String(methodStr).trim() !== '';
  const alreadyHasMethod = entries.some(([label]) =>
    label.toLowerCase() === 'method' || label.toLowerCase() === 'payment method'
  );
  if (hasMethod && !alreadyHasMethod) {
    entries.push(['Method', methodStr]);
  }

  // Card-specific display (cashout processing):
  // Show card tail and name-on-card when we detect method == "card".
  const rawMethod = transaction.payment_method ?? resolvedMethod;
  const isCard = typeof rawMethod === 'string' && rawMethod.trim().toLowerCase() === 'card';
  if (isCard && paymentDetails && typeof paymentDetails === 'object') {
    const tailVal = findPaymentDetailValue(paymentDetails, CARD_TAIL_KEYS);
    const cardDisplay = formatCardDetailsForDisplay(tailVal);
    if (cardDisplay) {
      const alreadyHasTail = entries.some(([label]) => label.toLowerCase() === 'card details');
      if (!alreadyHasTail) entries.push(['Card Details', cardDisplay]);
    }

    const nameVal = findPaymentDetailValue(paymentDetails, CARD_NAME_KEYS);
    const name = extractCardName(nameVal);
    if (name) {
      const alreadyHasName = entries.some(([label]) => label.toLowerCase() === 'name on card');
      if (!alreadyHasName) entries.push(['Name on Card', name]);
    }
  }

  const resolvedForVenmo = transaction.payment_method ?? resolvedMethod;
  const isVenmo =
    typeof resolvedForVenmo === 'string' && resolvedForVenmo.trim().toLowerCase() === 'venmo';
  if (isVenmo) {
    const usernameIdx = entries.findIndex(([label]) => label.toLowerCase() === 'username');
    if (usernameIdx >= 0) {
      const [, v] = entries[usernameIdx];
      entries[usernameIdx] = ['Venmo username', formatVenmoHandleForDisplay(String(v))];
    } else {
      let handleRaw = '';
      if (paymentDetails && typeof paymentDetails === 'object') {
        const v = findPaymentDetailValue(paymentDetails, VENMO_USERNAME_KEYS);
        if (v != null) {
          handleRaw = String(v).trim();
        }
      }
      if (!handleRaw && transaction.user_username?.trim()) {
        const u = transaction.user_username.trim();
        const nameRow = entries.find(([label]) => label.toLowerCase() === 'name');
        const sameAsDisplayName = nameRow && nameRow[1].trim().toLowerCase() === u.toLowerCase();
        if (!sameAsDisplayName) {
          handleRaw = u;
        }
      }
      if (handleRaw) {
        const displayHandle = formatVenmoHandleForDisplay(handleRaw);
        const alreadyListed = entries.some(
          ([label, v]) =>
            label.toLowerCase() === 'venmo username' ||
            String(v).trim().toLowerCase() === displayHandle.replace(/^@/, '').toLowerCase() ||
            String(v).trim().toLowerCase() === displayHandle.toLowerCase(),
        );
        if (!alreadyListed) {
          entries.push(['Venmo username', displayHandle]);
        }
      }
    }
  }

  const providerStatusEntries = getProviderStatusEntries(transaction);
  for (const entry of providerStatusEntries) {
    entries.push(entry);
  }
  return entries;
}

/**
 * Returns a user-friendly provider display name, accounting for combos like
 * provider=bitcoin_lightning + payment_method=cashapp → "Cashapp Pay".
 */
export function getProviderDisplayName(
  provider: string | null | undefined,
  paymentMethod?: string | null
): string {
  if (!provider) return '—';
  if (
    provider.toLowerCase() === 'bitcoin_lightning' &&
    paymentMethod?.toLowerCase() === 'cashapp'
  ) {
    return 'Cashapp Pay';
  }
  return formatPaymentMethod(provider);
}

export const formatPaymentMethod = (method: string | null | undefined): string => {
  if (!method || method.trim() === '') {
    return '—';
  }

  // Handle common methods that should be fully capitalized
  const upperCaseMethods = ['manual', 'bot', 'crypto'];
  if (upperCaseMethods.includes(method.toLowerCase())) {
    return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  }

  // Generic formatting: replace underscores and hyphens with spaces and capitalize each word
  return method
    .split(/[_\-\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const formatPercentage = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(2)}%`;
};

/** API ledger N/A is often "-" or empty (e.g. cashout limit on purchases). */
export function formatLedgerAmountDisplay(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === '' || s === '-') return null;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  return formatCurrency(s);
}

export function formatLedgerArrowDisplay(
  prevRaw: string | number | null | undefined,
  nextRaw: string | number | null | undefined,
): string {
  const prev = formatLedgerAmountDisplay(prevRaw);
  const next = formatLedgerAmountDisplay(nextRaw);
  if (prev === null && next === null) return '—';
  return `${prev ?? '—'} → ${next ?? '—'}`;
}

/**
 * Game activity history: API often omits `previous_*` on `create_game` / `add_user_game`.
 * When only `new_*` exists, show `$0.00 → $new` instead of hiding balances.
 */
export function formatBalanceTransitionDisplay(
  formattedPrevious: string | null,
  formattedNew: string | null,
  zeroCurrency: string,
): string {
  if (formattedPrevious && formattedNew) {
    return `${formattedPrevious} → ${formattedNew}`;
  }
  if (formattedNew) {
    return `${zeroCurrency} → ${formattedNew}`;
  }
  if (formattedPrevious) {
    return `${formattedPrevious} → ${zeroCurrency}`;
  }
  return '—';
}

/**
 * Formats a timestamp to a human-readable relative format for chat messages
 * Examples:
 * - "Just now" for messages less than 1 minute old
 * - "2m ago" for messages less than an hour old
 * - "3h ago" for messages less than 24 hours old
 * - "2 days ago" for messages less than a week old
 * - "3 weeks ago" for messages less than a month old
 * - "2 months ago" for messages less than a year old
 * - "1 year ago" for older messages
 */
/**
 * Validate if a timestamp value is valid and meaningful
 * Used to prevent invalid timestamps from overwriting valid ones
 */
export const isValidTimestamp = (timestamp: string | undefined | null): boolean => {
  if (!timestamp || timestamp.trim() === '') {
    return false;
  }

  // Check if it's a valid date string
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.getTime() > 0;
};

export const formatChatTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp || timestamp.trim() === '') {
    return '';
  }

  try {
    const date = new Date(timestamp);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Less than 1 minute ago
    if (diffMins < 1) {
      return 'Just now';
    }

    // Less than 1 hour ago - show minutes
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    // Less than 24 hours ago - show hours
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Less than 7 days ago - show days
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }

    // Less than 4 weeks (approximately 1 month) - show weeks
    if (diffWeeks < 4) {
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    }

    // Less than 12 months (approximately 1 year) - show months
    if (diffMonths < 12) {
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    }

    // 1 year or more - show years
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  } catch (error) {
    console.warn('Failed to format chat timestamp:', timestamp, error);
    return '';
  }
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365;

/**
 * Chat list timestamp:
 * - &lt; 24h: time only (e.g. "2:30 PM")
 * - ≥ 24h: date only — no time (e.g. "Feb 24" or "Feb 24, 2024" if different year)
 */
export const formatChatTimestampCompact = (timestamp: string | null | undefined): string => {
  if (!timestamp || timestamp.trim() === '') {
    return '';
  }

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / MS_PER_DAY;

    if (diffDays < 1) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    if (diffDays < DAYS_PER_YEAR) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

