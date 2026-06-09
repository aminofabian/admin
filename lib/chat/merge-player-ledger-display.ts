import type { ChatUser } from '@/types';

function isBlankLedger(value: string | undefined | null): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Overlay directory-row ledger fields onto the selected player for sidebar/drawer display.
 * This is a *fill-in* helper: it only supplies values that the selected player is missing
 * (e.g. the online-tab row omits cashoutLimit). It must NOT overwrite fresh values already
 * on `selected`, because `selected.balance`/`cashoutLimit` are kept in sync with the
 * chat-room WebSocket (which can be fresher than the directory row).
 */
export function mergeWinningBalanceFromDirectoryRow(
  selected: ChatUser,
  displayedPlayers: ChatUser[],
): ChatUser {
  const canonical = displayedPlayers.find((p) => p.user_id === selected.user_id);
  if (!canonical) return selected;

  const patch: Partial<ChatUser> = {};

  // winningBalance: align to the list row when the list row explicitly includes it.
  // (Single-balance backends omit the field; do not fabricate it here.)
  if (Object.prototype.hasOwnProperty.call(canonical, 'winningBalance')) {
    const listWinnings = canonical.winningBalance;
    if (listWinnings !== selected.winningBalance) {
      patch.winningBalance = listWinnings;
    }
  }

  if (isBlankLedger(selected.balance) && !isBlankLedger(canonical.balance)) {
    patch.balance = String(canonical.balance).trim();
  }
  if (isBlankLedger(selected.cashoutLimit) && !isBlankLedger(canonical.cashoutLimit)) {
    patch.cashoutLimit = String(canonical.cashoutLimit).trim();
  }
  if (isBlankLedger(selected.lockedBalance) && !isBlankLedger(canonical.lockedBalance)) {
    patch.lockedBalance = String(canonical.lockedBalance).trim();
  }

  if (Object.keys(patch).length === 0) {
    return selected;
  }

  return { ...selected, ...patch };
}
