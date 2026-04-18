import type { ChatUser } from '@/types';

function isBlankLedger(value: string | undefined | null): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Overlay directory-row ledger fields onto the selected player for sidebar/drawer display.
 * Fills cashout/locked when the selected row omitted them (e.g. online list vs all-chats shape).
 */
export function mergeWinningBalanceFromDirectoryRow(
  selected: ChatUser,
  displayedPlayers: ChatUser[],
): ChatUser {
  const canonical = displayedPlayers.find((p) => p.user_id === selected.user_id);
  if (!canonical) return selected;

  const listWinnings = Object.prototype.hasOwnProperty.call(canonical, 'winningBalance')
    ? canonical.winningBalance
    : undefined;

  const winningMatches = listWinnings === selected.winningBalance;

  const canonicalCashout =
    !isBlankLedger(canonical.cashoutLimit) ? String(canonical.cashoutLimit).trim() : undefined;
  const canonicalLocked =
    !isBlankLedger(canonical.lockedBalance) ? String(canonical.lockedBalance).trim() : undefined;

  const patch: Partial<ChatUser> = {};

  if (!winningMatches) {
    patch.winningBalance = listWinnings;
  }
  if (isBlankLedger(selected.cashoutLimit) && canonicalCashout !== undefined) {
    patch.cashoutLimit = canonicalCashout;
  }
  if (isBlankLedger(selected.lockedBalance) && canonicalLocked !== undefined) {
    patch.lockedBalance = canonicalLocked;
  }

  if (Object.keys(patch).length === 0) {
    return selected;
  }

  return { ...selected, ...patch };
}
