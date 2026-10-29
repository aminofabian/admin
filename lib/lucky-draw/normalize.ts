import type { DrawHistoryEntry, DrawMethod, DrawType, DrawWinner, PrizeStatus } from '@/types/lucky-draw';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function readDrawType(value: unknown): DrawType {
  return value === 'monthly' || value === 'gold' ? 'monthly' : 'weekly';
}

function readMethod(value: unknown): DrawMethod {
  return value === 'manual' ? 'manual' : 'automatic';
}

function readPrizeStatus(value: unknown): PrizeStatus {
  if (value === 'pending' || value === 'credited' || value === 'rejected') return value;
  return 'credited';
}

function extractRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];
  for (const key of ['results', 'history', 'cycles', 'items'] as const) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  return [];
}

function normalizeWinner(row: unknown, index: number): DrawWinner | null {
  if (!isRecord(row)) return null;
  const username = readString(row.player_username || row.username || row.user_username);
  if (!username) return null;
  const id = Number(row.id);
  const position = Number(row.position);
  return {
    id: Number.isFinite(id) ? id : index + 1,
    position: Number.isFinite(position) ? position : index + 1,
    player_id: typeof row.player_id === 'number' ? row.player_id : undefined,
    player_username: username,
    ticket_id: typeof row.ticket_id === 'number' ? row.ticket_id : undefined,
    prize_amount: readString(row.prize_amount ?? row.amount ?? row.prize) || '0.00',
    prize_status: readPrizeStatus(row.prize_status),
  };
}

/** Completed cycle from history list or history detail, including paginated `{ results }`. */
export function normalizeHistoryEntry(data: unknown): DrawHistoryEntry | null {
  if (!isRecord(data)) return null;
  const nested = isRecord(data.cycle) ? data.cycle : null;
  const source = nested ? { ...nested, winners: data.winners ?? nested.winners } : data;
  if (!isRecord(source)) return null;

  const id = Number(source.id);
  const winnersRaw = Array.isArray(source.winners) ? source.winners : [];
  const hasIdentity = Number.isFinite(id) || typeof source.draw_type === 'string' || winnersRaw.length > 0;
  if (!hasIdentity) return null;

  return {
    id: Number.isFinite(id) ? id : 0,
    draw_type: readDrawType(source.draw_type),
    status: source.status === 'active' || source.status === 'cancelled' ? source.status : 'completed',
    draw_method: readMethod(source.draw_method ?? source.method),
    started_at: readString(source.started_at),
    completed_at: readString(source.completed_at || source.drawn_at || source.created_at),
    scheduled_draw_at: readString(source.scheduled_draw_at || source.scheduled_at) || undefined,
    ticket_count: Number(source.ticket_count) || 0,
    player_count: Number(source.player_count ?? source.unique_player_count) || 0,
    prize_status:
      source.prize_status === 'pending' ||
      source.prize_status === 'credited' ||
      source.prize_status === 'rejected'
        ? source.prize_status
        : undefined,
    winners: winnersRaw.flatMap((winner, index) => {
      const parsed = normalizeWinner(winner, index);
      return parsed ? [parsed] : [];
    }),
  };
}

export function normalizeHistoryList(data: unknown): DrawHistoryEntry[] {
  return extractRows(data).flatMap((row) => {
    const entry = normalizeHistoryEntry(row);
    return entry ? [entry] : [];
  });
}

export function luckyDrawErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (record.code === 'company_required') return 'Select a company to continue.';
    if (record.code === 'manual_thresholds_not_met') {
      return 'Manual draw thresholds are not met.';
    }
  }
  return fallback;
}
