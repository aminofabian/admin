import type { ChatUser } from '@/types';

/**
 * Overlay directory-row `winningBalance` onto the selected player for sidebar/drawer display.
 * Avoids a one-frame flash where `selectedPlayer` still holds stale winnings while
 * `displayedPlayers` already reflects WS/API corrections.
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

  if (listWinnings === selected.winningBalance) {
    return selected;
  }

  return { ...selected, winningBalance: listWinnings };
}
