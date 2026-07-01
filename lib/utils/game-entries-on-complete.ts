/**
 * Games that use balance + entries (not balance alone) when manually completing recharge/redeem.
 * Examples: River Sweeps / Riversweep, Golden Dragon.
 */
const ENTRIES_GAME_SIGNATURES = ['riversweep', 'goldendragon', 'riverpay'] as const;

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
}

/**
 * Whether manual complete must collect `new_entries` in addition to `new_balance`.
 */
export function requiresEntriesOnComplete(hints: EntriesOnCompleteGameHints): boolean {
  return identifiersMatchEntriesGame(
    hints.gameCode,
    hints.gameTitle,
    hints.gameCategory,
  );
}
