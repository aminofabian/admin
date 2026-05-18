import type { Transaction, TransactionQueue } from '@/types';
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
  game?: string;
  game_code?: string;
  payment_method?: string;
  operator?: string;
  created_at: string;
  updated_at?: string;
  raw: Record<string, unknown>;
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

export function mapPlayerTimelineResult(raw: Record<string, unknown>): PlayerTimelineItem {
  const type = String(raw.type ?? raw.txn_type ?? '').trim();
  const kind: PlayerTimelineKind = isPlayerTimelineGameActivity(type)
    ? 'game_activity'
    : 'transaction';

  const createdAt = String(
    raw.created_at ?? raw.created ?? raw.updated_at ?? raw.updated ?? '',
  );
  const updatedAt = String(raw.updated_at ?? raw.updated ?? createdAt);

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
      raw.bonus_amount != null && raw.bonus_amount !== ''
        ? normalizeAmount(raw.bonus_amount)
        : undefined,
    game: typeof raw.game === 'string' ? raw.game : undefined,
    game_code: typeof raw.game_code === 'string' ? raw.game_code : undefined,
    payment_method:
      typeof raw.payment_method === 'string' ? raw.payment_method : undefined,
    operator: typeof raw.operator === 'string' ? raw.operator : undefined,
    created_at: createdAt,
    updated_at: updatedAt,
    raw,
  };
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
    provider: typeof raw.provider === 'string' ? raw.provider : null,
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
    reason: typeof raw.reason === 'string' ? raw.reason : null,
    reason_display:
      typeof raw.reason_display === 'string' ? raw.reason_display : null,
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
    payment_details:
      raw.payment_details && typeof raw.payment_details === 'object'
        ? (raw.payment_details as Record<string, unknown>)
        : null,
    company_id: raw.company_id != null ? Number(raw.company_id) : undefined,
    company_username:
      typeof raw.company_username === 'string' ? raw.company_username : undefined,
    binpay_status: typeof raw.binpay_status === 'string' ? raw.binpay_status : null,
    tierlock_status:
      typeof raw.tierlock_status === 'string' ? raw.tierlock_status : null,
    taparcadia_status:
      typeof raw.taparcadia_status === 'string' ? raw.taparcadia_status : null,
  };
}
