import type { TransactionQueue } from '@/types';
import type { Game } from '@/types';

/**
 * Games that use balance + entries (not balance alone) when manually completing recharge/redeem.
 * Examples: River Sweeps / Riversweep, Golden Dragon.
 */
const ENTRIES_GAME_SIGNATURES = [
  'riversweep',
  'riversweeps',
  'goldendragon',
  'riverpay',
] as const;

const QUEUE_DATA_GAME_HINT_KEYS = [
  'game',
  'game_title',
  'gameTitle',
  'game_name',
  'gameName',
  'game_code',
  'gameCode',
  'integration',
  'platform',
  'provider',
] as const;

export function normalizeGameIdentifier(value?: string | null): string {
  return (value ?? '').toLowerCase().replace(/[\s_\-]+/g, '');
}

function identifiersMatchEntriesGame(...values: Array<string | null | undefined>): boolean {
  const combined = values.map(normalizeGameIdentifier).join('|');
  return ENTRIES_GAME_SIGNATURES.some((signature) => combined.includes(signature));
}

export interface EntriesOnCompleteGameHints {
  gameCode?: string | null;
  gameTitle?: string | null;
  gameCategory?: string | null;
  remarks?: string | null;
  dataStrings?: Array<string | null | undefined>;
}

/**
 * Whether manual complete must collect `new_entries` in addition to `new_balance`.
 */
export function requiresEntriesOnComplete(hints: EntriesOnCompleteGameHints): boolean {
  if (identifiersMatchEntriesGame(hints.gameCode, hints.gameTitle, hints.gameCategory, hints.remarks)) {
    return true;
  }

  return identifiersMatchEntriesGame(...(hints.dataStrings ?? []));
}

function readQueueDataFlag(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false;

  for (const key of ['requires_new_entries', 'requires_entries', 'needs_entries'] as const) {
    const value = data[key];
    if (value === true || value === 1 || value === '1' || value === 'true') {
      return true;
    }
  }

  return false;
}

export function collectQueueGameHintStrings(
  data: Record<string, unknown> | null | undefined,
): string[] {
  if (!data) return [];

  const hints: string[] = [];
  for (const key of QUEUE_DATA_GAME_HINT_KEYS) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      hints.push(value.trim());
    }
  }

  return hints;
}

export function requiresEntriesOnCompleteFromQueue(
  queue: Pick<TransactionQueue, 'game' | 'game_code' | 'remarks' | 'data'>,
  matchedGame?: Pick<Game, 'code' | 'title' | 'game_category'>,
): boolean {
  const data =
    queue.data && typeof queue.data === 'object' && !Array.isArray(queue.data)
      ? queue.data
      : null;

  if (readQueueDataFlag(data)) {
    return true;
  }

  const dataGameCode =
    typeof data?.game_code === 'string'
      ? data.game_code
      : typeof data?.gameCode === 'string'
        ? data.gameCode
        : null;
  const dataGameTitle =
    typeof data?.game_title === 'string'
      ? data.game_title
      : typeof data?.game === 'string'
        ? data.game
        : null;

  return requiresEntriesOnComplete({
    gameCode: queue.game_code || dataGameCode || matchedGame?.code,
    gameTitle: queue.game || dataGameTitle || matchedGame?.title,
    gameCategory: matchedGame?.game_category,
    remarks: queue.remarks,
    dataStrings: collectQueueGameHintStrings(data),
  });
}

/**
 * Riversweep / Golden Dragon / RiverPay share sweepstakes-style manual flows
 * (balance + entries on recharge/redeem complete).
 */
export function isSweepstakesStyleGameFromQueue(
  queue: Pick<TransactionQueue, 'game' | 'game_code' | 'remarks' | 'data'>,
  matchedGame?: Pick<Game, 'code' | 'title' | 'game_category'>,
): boolean {
  return requiresEntriesOnCompleteFromQueue(queue, matchedGame);
}

const RIVERSWEEP_SIGNATURES = ['riversweep', 'riversweeps'] as const;

function identifiersMatchRiversweep(...values: Array<string | null | undefined>): boolean {
  const combined = values.map(normalizeGameIdentifier).join('|');
  return RIVERSWEEP_SIGNATURES.some((signature) => combined.includes(signature));
}

/**
 * Riversweep add-user manual complete is username-only (no game_password in payload).
 */
export function isRiversweepGameFromQueue(
  queue: Pick<TransactionQueue, 'game' | 'game_code' | 'remarks' | 'data'>,
  matchedGame?: Pick<Game, 'code' | 'title' | 'game_category'>,
): boolean {
  const data =
    queue.data && typeof queue.data === 'object' && !Array.isArray(queue.data)
      ? queue.data
      : null;

  const dataGameCode =
    typeof data?.game_code === 'string'
      ? data.game_code
      : typeof data?.gameCode === 'string'
        ? data.gameCode
        : null;
  const dataGameTitle =
    typeof data?.game_title === 'string'
      ? data.game_title
      : typeof data?.game === 'string'
        ? data.game
        : null;

  return identifiersMatchRiversweep(
    queue.game_code,
    queue.game,
    queue.remarks,
    dataGameCode,
    dataGameTitle,
    matchedGame?.code,
    matchedGame?.title,
    matchedGame?.game_category,
    ...collectQueueGameHintStrings(data),
  );
}
