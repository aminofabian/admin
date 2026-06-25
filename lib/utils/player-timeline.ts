import type { Transaction, TransactionQueue } from '@/types';
import {
  formatCurrency,
  formatPaymentMethod,
  getProviderDisplayName,
} from '@/lib/utils/formatters';
import { getTransactionKind } from '@/lib/utils/transaction-display';

const GAME_ACTIVITY_TIMELINE_TYPES = new Set([
  'recharge_game',
  'redeem_game',
  'add_user_game',
  'create_game',
  'reset_password',
  'change_password',
]);

export type PlayerTimelineKind = 'transaction' | 'game_activity';

/** Spin metadata from `roulette_spins` on player-timeline-history rows. */
export type RouletteTimelineSpins = {
  entry_type?: string;
  quantity?: number;
  previous_balance?: number;
  new_balance?: number;
  reason?: string;
  reward_id?: number;
  reward_type?: string;
  position?: number;
};

export interface PlayerTimelineItem {
  id: string;
  kind: PlayerTimelineKind;
  type: string;
  status: string;
  user_id?: number;
  user_username?: string;
  user_email?: string;
  amount?: string;
  bonus_amount?: string;
  previous_balance?: string;
  new_balance?: string;
  game?: string;
  game_code?: string;
  payment_method?: string;
  operator?: string;
  provider?: string;
  reason?: string;
  reason_display?: string;
  roulette_spins?: RouletteTimelineSpins;
  created_at: string;
  updated_at?: string;
  raw: Record<string, unknown>;
}

export type PlayerTimelineAmountDisplay = {
  primaryText: string;
  secondaryText?: string;
  /** When false, primary line is spin/respin text rather than currency. */
  showAsCurrency: boolean;
};

function readOptionalInt(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseRouletteTimelineSpinsFromRecord(
  s: Record<string, unknown>,
  position?: number,
): RouletteTimelineSpins {
  const quantity = readOptionalInt(s.quantity);
  return {
    entry_type: typeof s.entry_type === 'string' ? s.entry_type : undefined,
    quantity: quantity != null ? Math.abs(quantity) : undefined,
    previous_balance: readOptionalInt(s.previous_balance),
    new_balance: readOptionalInt(s.new_balance),
    reason: typeof s.reason === 'string' ? s.reason : undefined,
    reward_id: readOptionalInt(s.reward_id),
    reward_type: typeof s.reward_type === 'string' ? s.reward_type : undefined,
    position: readOptionalInt(s.position) ?? position,
  };
}

/** Normalize spin metadata from `roulette_spins` or `roulette_reward` timeline rows. */
export function parseRouletteTimelineSpins(
  raw: Record<string, unknown>,
): RouletteTimelineSpins | undefined {
  const spinsRaw = raw.roulette_spins;
  if (spinsRaw && typeof spinsRaw === 'object') {
    return parseRouletteTimelineSpinsFromRecord(spinsRaw as Record<string, unknown>);
  }

  const rewardRaw = raw.roulette_reward;
  if (!rewardRaw || typeof rewardRaw !== 'object') return undefined;

  const reward = rewardRaw as Record<string, unknown>;
  const rouletteRaw = raw.roulette;
  const roulette =
    rouletteRaw && typeof rouletteRaw === 'object'
      ? (rouletteRaw as Record<string, unknown>)
      : null;
  const position = readOptionalInt(roulette?.position);
  const rewardType =
    typeof reward.reward_type === 'string' ? reward.reward_type.toLowerCase() : '';

  return parseRouletteTimelineSpinsFromRecord(
    {
      entry_type: 'reward_add',
      reward_type: typeof reward.reward_type === 'string' ? reward.reward_type : undefined,
      quantity: readOptionalInt(reward.quantity) ?? (rewardType === 'respin' ? 1 : undefined),
      previous_balance: reward.previous_balance,
      new_balance: reward.new_balance,
      reward_id: reward.reward_id,
      position,
    },
    position,
  );
}

export function isRouletteTimelineItem(item: PlayerTimelineItem): boolean {
  if (String(item.provider ?? '').trim().toLowerCase() === 'roulette') return true;
  if (item.roulette_spins) return true;
  const timelineSource = String(item.raw.timeline_source ?? '').toLowerCase();
  if (timelineSource === 'roulette_reward' || timelineSource.startsWith('roulette')) {
    return true;
  }
  if (item.raw.roulette_reward || item.raw.roulette) return true;
  const reason = String(item.reason ?? item.raw.reason ?? '').toLowerCase();
  return reason.startsWith('roulette_') || reason.includes('roulette');
}

export function isRouletteTransaction(
  transaction: Pick<Transaction, 'provider' | 'payment_details' | 'reason'>,
): boolean {
  if (String(transaction.provider ?? '').trim().toLowerCase() === 'roulette') return true;
  const pd = transaction.payment_details;
  if (pd && typeof pd === 'object' && pd.roulette_spins) return true;
  const reason = String(transaction.reason ?? '').toLowerCase();
  return reason.startsWith('roulette_') || reason.includes('roulette');
}

function humanizeSnakeCase(value: string): string {
  return value
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ROULETTE_REASON_LABELS: Record<string, string> = {
  roulette_respin: 'Respin won',
  roulette_spin: 'Spin used',
  roulette_spin_use: 'Spin used',
  roulette_reward: 'Prize won',
  roulette_try_again: 'Try again',
  roulette_win: 'Prize won',
  roulette_main_balance: 'Main balance prize',
  admin_spin_balance_add: 'Admin spins added',
  admin_spin_balance_deduct: 'Admin spins deducted',
  spin_balance_add: 'Admin spins added',
  spin_balance_deduct: 'Admin spins deducted',
};

function resolveRouletteReasonLabel(
  reason?: string | null,
  reasonDisplay?: string | null,
): string | undefined {
  const key = String(reason ?? '').trim().toLowerCase();
  if (key && ROULETTE_REASON_LABELS[key]) return ROULETTE_REASON_LABELS[key];
  const display = String(reasonDisplay ?? '').trim();
  if (display) return humanizeSnakeCase(display);
  if (key) return humanizeSnakeCase(key);
  return undefined;
}

function resolveSpinDirection(
  item: PlayerTimelineItem,
  spins?: RouletteTimelineSpins,
): 'add' | 'deduct' {
  const entry = String(spins?.entry_type ?? '').toLowerCase();
  if (entry.includes('deduct') || entry.includes('use')) return 'deduct';
  if (entry.includes('add') || entry.includes('reward')) {
    const txn = item.type.toLowerCase();
    if (txn === 'deduct') return 'deduct';
    return 'add';
  }
  return item.type.toLowerCase() === 'deduct' ? 'deduct' : 'add';
}

export function formatRouletteSpinQuantityLine(
  spins: RouletteTimelineSpins,
  direction: 'add' | 'deduct',
): string {
  const qty = Math.max(1, spins.quantity ?? 1);
  const rewardType = String(spins.reward_type ?? '').toLowerCase();

  if (rewardType === 'respin') {
    const unit = qty === 1 ? 'respin' : 'respins';
    return direction === 'add' ? `+${qty} ${unit}` : `−${qty} ${unit}`;
  }
  if (rewardType === 'try_again') {
    return 'Try again';
  }

  const unit = qty === 1 ? 'spin' : 'spins';
  return direction === 'add' ? `+${qty} ${unit}` : `−${qty} ${unit}`;
}

export function isPlayerTimelineGameActivity(type: string | undefined | null): boolean {
  const t = String(type ?? '').trim().toLowerCase();
  return GAME_ACTIVITY_TIMELINE_TYPES.has(t);
}

function normalizeAmount(value: unknown): string {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return String(value);
  }
  if (value != null && value !== '') {
    return String(value);
  }
  return '0';
}

function resolveProviderFromRaw(raw: Record<string, unknown>): string | undefined {
  const timelineSource = String(raw.timeline_source ?? '').toLowerCase();
  if (
    timelineSource === 'roulette_reward' ||
    timelineSource.startsWith('roulette') ||
    raw.roulette_reward ||
    raw.roulette
  ) {
    return 'roulette';
  }

  if (typeof raw.provider === 'string' && raw.provider.trim()) {
    return raw.provider.trim();
  }

  const paymentDetails = raw.payment_details;
  if (paymentDetails && typeof paymentDetails === 'object' && paymentDetails !== null) {
    const nestedProvider = (paymentDetails as Record<string, unknown>).provider;
    if (typeof nestedProvider === 'string' && nestedProvider.trim()) {
      return nestedProvider.trim();
    }
  }

  return undefined;
}

export function mapPlayerTimelineResult(raw: Record<string, unknown>): PlayerTimelineItem {
  const type = String(raw.type ?? raw.txn_type ?? '').trim();
  const kind: PlayerTimelineKind = isPlayerTimelineGameActivity(type)
    ? 'game_activity'
    : 'transaction';

  const createdAt = String(
    raw.created_at ?? raw.created ?? raw.updated_at ?? raw.updated ?? '',
  );
  const updatedAt = String(raw.updated_at ?? raw.updated ?? createdAt);

  const data =
    raw.data && typeof raw.data === 'object' && raw.data !== null
      ? (raw.data as Record<string, unknown>)
      : null;
  const bonusRaw =
    raw.bonus_amount ?? (data?.bonus_amount != null ? data.bonus_amount : undefined);

  const roulette_spins = parseRouletteTimelineSpins(raw);

  return {
    id: String(raw.id ?? ''),
    kind,
    type,
    status: String(raw.status ?? ''),
    user_id: raw.user_id != null ? Number(raw.user_id) : undefined,
    user_username:
      typeof raw.user_username === 'string'
        ? raw.user_username
        : typeof raw.username === 'string'
          ? raw.username
          : undefined,
    user_email: typeof raw.user_email === 'string' ? raw.user_email : undefined,
    amount: normalizeAmount(raw.amount),
    bonus_amount:
      bonusRaw != null && bonusRaw !== '' ? normalizeAmount(bonusRaw) : undefined,
    previous_balance:
      raw.previous_balance != null && raw.previous_balance !== ''
        ? normalizeAmount(raw.previous_balance)
        : raw.previous_credits_balance != null && raw.previous_credits_balance !== ''
          ? normalizeAmount(raw.previous_credits_balance)
          : undefined,
    new_balance:
      raw.new_balance != null && raw.new_balance !== ''
        ? normalizeAmount(raw.new_balance)
        : raw.new_credits_balance != null && raw.new_credits_balance !== ''
          ? normalizeAmount(raw.new_credits_balance)
          : undefined,
    game: typeof raw.game === 'string' ? raw.game : undefined,
    game_code: typeof raw.game_code === 'string' ? raw.game_code : undefined,
    payment_method:
      typeof raw.payment_method === 'string' ? raw.payment_method : undefined,
    operator: typeof raw.operator === 'string' ? raw.operator : undefined,
    provider: resolveProviderFromRaw(raw),
    reason: typeof raw.reason === 'string' ? raw.reason : undefined,
    reason_display:
      typeof raw.reason_display === 'string' ? raw.reason_display : undefined,
    roulette_spins,
    created_at: createdAt,
    updated_at: updatedAt,
    raw,
  };
}

function resolveMoneyBalanceDisplay(
  item: PlayerTimelineItem,
): { displayText: string; colorClass: string } | null {
  const hasPrevious = item.previous_balance != null && item.previous_balance !== '';
  const hasNew = item.new_balance != null && item.new_balance !== '';
  if (!hasPrevious && !hasNew) return null;

  const previousValue =
    hasPrevious && !Number.isNaN(parseFloat(item.previous_balance!))
      ? parseFloat(item.previous_balance!)
      : 0;
  const newValue =
    hasNew && !Number.isNaN(parseFloat(item.new_balance!))
      ? parseFloat(item.new_balance!)
      : 0;

  const previousFormatted = formatCurrency(String(previousValue));
  const newFormatted = formatCurrency(String(newValue));
  const creditChanged = previousValue !== newValue;

  return {
    displayText: `${previousFormatted} → ${newFormatted}`,
    colorClass: creditChanged
      ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
      : 'text-gray-600 dark:text-gray-400',
  };
}

function resolveRouletteSpinBalanceDisplay(
  item: PlayerTimelineItem,
): { displayText: string; colorClass: string } | null {
  const spins = item.roulette_spins;
  if (!spins) return null;

  const hasPrevious = spins.previous_balance != null;
  const hasNew = spins.new_balance != null;
  if (!hasPrevious && !hasNew) return null;

  const previousValue = hasPrevious ? spins.previous_balance! : 0;
  const newValue = hasNew ? spins.new_balance! : 0;
  const changed = previousValue !== newValue;

  return {
    displayText: `${previousValue} → ${newValue} spins`,
    colorClass: changed
      ? 'text-violet-600 dark:text-violet-400 font-semibold'
      : 'text-gray-600 dark:text-gray-400',
  };
}

function hasMeaningfulMoneyBalanceChange(item: PlayerTimelineItem): boolean {
  const amount = parseFloat(item.amount ?? '0');
  const bonus = parseFloat(item.bonus_amount ?? '0');
  if (amount > 0 || bonus > 0) return true;

  const prev = parseFloat(item.previous_balance ?? '0');
  const next = parseFloat(item.new_balance ?? '0');
  return !Number.isNaN(prev) && !Number.isNaN(next) && prev !== next && (prev > 0 || next > 0);
}

/** Balance transition label and styling, matching transactions history table. */
export function resolvePlayerTimelineBalanceDisplay(
  item: PlayerTimelineItem,
): { displayText: string; colorClass: string } | null {
  const moneyDisplay = resolveMoneyBalanceDisplay(item);
  const spinDisplay = resolveRouletteSpinBalanceDisplay(item);

  if (isRouletteTimelineItem(item) && spinDisplay) {
    if (!hasMeaningfulMoneyBalanceChange(item)) return spinDisplay;
  }

  return moneyDisplay ?? spinDisplay;
}

/** Returns bonus amount string when present and > 0, otherwise null. */
export function resolvePlayerTimelineBonusAmount(
  item: PlayerTimelineItem,
): string | null {
  const bonusRaw = item.bonus_amount;
  if (bonusRaw == null || bonusRaw === '') return null;
  const bonusValue = parseFloat(bonusRaw);
  if (Number.isNaN(bonusValue) || bonusValue <= 0) return null;
  return bonusRaw;
}

export function resolvePlayerTimelineAmountDisplay(
  item: PlayerTimelineItem,
): PlayerTimelineAmountDisplay {
  const bonusRaw = resolvePlayerTimelineBonusAmount(item);
  const formattedBonus = bonusRaw ? formatCurrency(bonusRaw) : undefined;
  const amountValue = parseFloat(item.amount ?? '0');
  const hasMoney = !Number.isNaN(amountValue) && amountValue > 0;

  if (isRouletteTimelineItem(item)) {
    const spins = item.roulette_spins;
    const spinLine =
      spins != null ? formatRouletteSpinQuantityLine(spins, resolveSpinDirection(item, spins)) : null;

    if (hasMoney) {
      return {
        primaryText: formatCurrency(item.amount ?? '0'),
        secondaryText: formattedBonus
          ? `+${formattedBonus} bonus`
          : spinLine ?? undefined,
        showAsCurrency: true,
      };
    }

    if (spinLine) {
      return {
        primaryText: spinLine,
        secondaryText: formattedBonus ? `+${formattedBonus} bonus` : undefined,
        showAsCurrency: false,
      };
    }
  }

  return {
    primaryText: formatCurrency(item.amount ?? '0'),
    secondaryText: formattedBonus ? `+${formattedBonus} bonus` : undefined,
    showAsCurrency: true,
  };
}

export function formatRouletteTimelineTypeLabel(item: PlayerTimelineItem): string {
  const reason = String(item.reason ?? '').toLowerCase();
  const entry = String(item.roulette_spins?.entry_type ?? '').toLowerCase();
  const rewardType = String(item.roulette_spins?.reward_type ?? '').toLowerCase();

  if (
    reason.includes('admin') ||
    reason.includes('spin_balance') ||
    entry.includes('admin')
  ) {
    return item.type.toLowerCase() === 'add' ? 'Spins added' : 'Spins deducted';
  }
  if (reason.includes('respin') || rewardType === 'respin') return 'Respin won';
  if (item.type.toLowerCase() === 'deduct' || entry.includes('use')) return 'Spin used';
  if (rewardType === 'try_again' || reason.includes('try_again')) return 'Try again';
  if (rewardType === 'main_balance' || parseFloat(item.amount ?? '0') > 0) return 'Prize won';
  if (item.type.toLowerCase() === 'add') return 'Spin reward';
  return item.type.charAt(0).toUpperCase() + item.type.slice(1);
}

/** API often sends internal refs like "Roulette 75" or "Roulette C8BC…" — not user-facing game names. */
function isInternalRouletteGameLabel(value: string | undefined): boolean {
  const label = String(value ?? '').trim();
  if (!label) return false;
  if (/^prize\s*wheel$/i.test(label)) return true;
  if (/^roulette$/i.test(label)) return true;
  return /^roulette\s+[\da-f-]+$/i.test(label);
}

export function formatPlayerTimelineDetailLabel(item: PlayerTimelineItem): string {
  if (item.kind === 'game_activity') {
    return item.game || item.game_code || '—';
  }

  if (isRouletteTimelineItem(item)) {
    const reason = String(item.reason ?? '').toLowerCase();
    if (reason.includes('admin') || reason.includes('spin_balance')) {
      const note =
        typeof item.raw.remarks === 'string' && item.raw.remarks.trim()
          ? item.raw.remarks.trim()
          : undefined;
      return note ?? 'Admin spin adjustment';
    }

    const game = item.game?.trim();
    if (game && !isInternalRouletteGameLabel(game)) {
      return game;
    }

    const position = item.roulette_spins?.position;
    if (position != null) {
      return `Prize wheel · Slot ${position}`;
    }

    return 'Prize wheel';
  }

  const providerDisplay = getProviderDisplayName(item.provider, item.payment_method);
  if (providerDisplay !== '—') return providerDisplay;

  const method = item.payment_method?.trim();
  return method ? formatPaymentMethod(method) : '—';
}

export function getRouletteTransactionDetailEntries(
  transaction: Pick<
    Transaction,
    'provider' | 'payment_details' | 'reason' | 'reason_display' | 'type' | 'amount' | 'bonus_amount'
  >,
): [string, string][] {
  if (!isRouletteTransaction(transaction)) return [];

  const pd = transaction.payment_details;
  const spinsRaw =
    pd && typeof pd === 'object' && pd.roulette_spins && typeof pd.roulette_spins === 'object'
      ? (pd.roulette_spins as Record<string, unknown>)
      : null;
  const spins = spinsRaw ? parseRouletteTimelineSpins({ roulette_spins: spinsRaw }) : undefined;

  const entries: [string, string][] = [['Source', 'Prize wheel']];

  const reasonLabel = resolveRouletteReasonLabel(
    transaction.reason,
    transaction.reason_display,
  );
  if (reasonLabel) entries.push(['Event', reasonLabel]);

  if (spins?.reward_type) {
    entries.push(['Reward type', humanizeSnakeCase(spins.reward_type)]);
  }
  if (spins?.position != null) {
    entries.push(['Wheel position', String(spins.position)]);
  }
  if (spins?.quantity != null) {
    const direction = resolveSpinDirection(
      { type: transaction.type, raw: {} } as PlayerTimelineItem,
      spins,
    );
    entries.push(['Spins', formatRouletteSpinQuantityLine(spins, direction)]);
  }
  if (spins?.previous_balance != null || spins?.new_balance != null) {
    entries.push([
      'Spin balance',
      `${spins?.previous_balance ?? 0} → ${spins?.new_balance ?? 0}`,
    ]);
  }
  if (spins?.reward_id != null) {
    entries.push(['Reward id', String(spins.reward_id)]);
  }

  return entries;
}

export function playerTimelineItemToTransactionQueue(
  item: PlayerTimelineItem,
): TransactionQueue {
  const raw = item.raw;
  const data =
    raw.data && typeof raw.data === 'object' && raw.data !== null
      ? (raw.data as Record<string, unknown>)
      : null;

  let amount = item.amount ?? '0';
  if (amount === '0' && data) {
    if (data.amount != null) {
      amount = normalizeAmount(data.amount);
    } else if (data.get_total_amount != null) {
      amount = normalizeAmount(data.get_total_amount);
    }
  }

  return {
    id: item.id,
    type: item.type as TransactionQueue['type'],
    status: item.status as TransactionQueue['status'],
    user_id: item.user_id ?? 0,
    user_username: item.user_username,
    user_email: item.user_email,
    operator: item.operator,
    game_username:
      typeof raw.game_username === 'string'
        ? raw.game_username
        : typeof data?.username === 'string'
          ? data.username
          : undefined,
    game: item.game ?? '',
    game_code: item.game_code ?? '',
    amount,
    bonus_amount: item.bonus_amount,
    remarks: String(raw.remarks ?? ''),
    data,
    created_at: item.created_at,
    updated_at: item.updated_at ?? item.created_at,
    company_id: raw.company_id != null ? Number(raw.company_id) : undefined,
    company_username:
      typeof raw.company_username === 'string' ? raw.company_username : undefined,
  };
}

export function playerTimelineItemToTransaction(item: PlayerTimelineItem): Transaction {
  const raw = item.raw;
  const kind = getTransactionKind({
    type: item.type,
    txn_type: typeof raw.txn_type === 'string' ? raw.txn_type : undefined,
  });

  const existingPaymentDetails =
    raw.payment_details && typeof raw.payment_details === 'object'
      ? (raw.payment_details as Record<string, unknown>)
      : null;

  const payment_details: Record<string, unknown> | null = item.roulette_spins
    ? {
        ...(existingPaymentDetails ?? {}),
        roulette_spins: item.roulette_spins,
      }
    : existingPaymentDetails;

  return {
    id: item.id,
    user_id: item.user_id,
    user_username: item.user_username ?? '',
    user_email: item.user_email ?? '',
    amount: item.amount ?? '0',
    bonus_amount: item.bonus_amount ?? '0',
    status: item.status as Transaction['status'],
    type: (kind || item.type) as Transaction['type'],
    txn_type: typeof raw.txn_type === 'string' ? raw.txn_type : undefined,
    operator: item.operator ?? '',
    payment_method: item.payment_method ?? '',
    provider: item.provider ?? (typeof raw.provider === 'string' ? raw.provider : null),
    currency: String(raw.currency ?? 'USD'),
    description: String(raw.description ?? ''),
    journal_entry: (raw.journal_entry as Transaction['journal_entry']) ?? 'debit',
    previous_balance: String(raw.previous_balance ?? '0'),
    new_balance: String(raw.new_balance ?? '0'),
    previous_winning_balance:
      raw.previous_winning_balance != null
        ? String(raw.previous_winning_balance)
        : undefined,
    new_winning_balance:
      raw.new_winning_balance != null ? String(raw.new_winning_balance) : undefined,
    previous_cashout_limit:
      raw.previous_cashout_limit != null ? String(raw.previous_cashout_limit) : null,
    new_cashout_limit:
      raw.new_cashout_limit != null ? String(raw.new_cashout_limit) : null,
    new_locked_balance:
      raw.new_locked_balance != null ? String(raw.new_locked_balance) : null,
    reason: item.reason ?? (typeof raw.reason === 'string' ? raw.reason : null),
    reason_display:
      item.reason_display ??
      (typeof raw.reason_display === 'string' ? raw.reason_display : null),
    agent_id: raw.agent_id != null ? Number(raw.agent_id) : undefined,
    agent_username:
      typeof raw.agent_username === 'string' ? raw.agent_username : undefined,
    merchant_username:
      typeof raw.merchant_username === 'string' ? raw.merchant_username : undefined,
    unique_id: String(raw.unique_id ?? item.id),
    role: String(raw.role ?? ''),
    action: String(raw.action ?? ''),
    remarks: raw.remarks != null ? String(raw.remarks) : null,
    created: String(raw.created ?? item.created_at),
    updated: String(raw.updated ?? item.updated_at ?? item.created_at),
    created_at: item.created_at,
    updated_at: item.updated_at ?? item.created_at,
    payment_url: typeof raw.payment_url === 'string' ? raw.payment_url : null,
    invoice_url: typeof raw.invoice_url === 'string' ? raw.invoice_url : undefined,
    payment_details,
    company_id: raw.company_id != null ? Number(raw.company_id) : undefined,
    company_username:
      typeof raw.company_username === 'string' ? raw.company_username : undefined,
    binpay_status: typeof raw.binpay_status === 'string' ? raw.binpay_status : null,
    tierlock_status:
      typeof raw.tierlock_status === 'string' ? raw.tierlock_status : null,
    tierlock_order_id:
      typeof raw.tierlock_order_id === 'string' ? raw.tierlock_order_id : null,
    taparcadia_status:
      typeof raw.taparcadia_status === 'string'
        ? raw.taparcadia_status
        : typeof raw.taparcaida_status === 'string'
          ? raw.taparcaida_status
          : null,
    taparcaida_ticket_id:
      raw.taparcaida_ticket_id != null
        ? String(raw.taparcaida_ticket_id)
        : raw.taparcadia_ticket_id != null
          ? String(raw.taparcadia_ticket_id)
          : null,
  };
}
