/** Stable identity for the conversation whose thread is loaded. */
export function conversationRoomKey(
  userId: number | null | undefined,
  chatId: string | null | undefined,
): string {
  return `${userId ?? ''}:${chatId ?? ''}`;
}

/**
 * The sidebar may copy the open thread's newest line only after that thread
 * was loaded for the conversation currently selected.
 *
 * Selection changes one render before the previous room's messages are
 * cleared. Writing during that render puts the other chat's last message and
 * timestamp on the row that was just clicked, until this room's history
 * arrives and overwrites it.
 */
export function sidebarPreviewBelongsToSelection(input: {
  selectedUserId: number | null | undefined;
  selectedChatId: string | null | undefined;
  messagesRoomKey: string | null;
  hasCompletedInitialHistory: boolean;
  messageCount: number;
}): boolean {
  if (!input.hasCompletedInitialHistory || input.messageCount <= 0) return false;
  if (input.selectedUserId == null || input.messagesRoomKey == null) return false;
  return (
    input.messagesRoomKey ===
    conversationRoomKey(input.selectedUserId, input.selectedChatId)
  );
}

/**
 * Room to stamp on a preview that came from a socket opened for `socketUserId`.
 *
 * After a click, refs already point at the new conversation while the previous
 * socket can still emit. Pairing that event with the new chat id is what
 * briefly shows the other conversation's last line.
 */
export function previewRoomForSocket(input: {
  socketUserId: number | null;
  currentUserId: number | null;
  currentChatId: string | null;
}): { userId: number; chatId: string } {
  const samePlayer =
    input.socketUserId != null &&
    input.currentUserId != null &&
    input.socketUserId === input.currentUserId;
  return {
    userId: input.socketUserId ?? 0,
    chatId: samePlayer && input.currentChatId ? String(input.currentChatId) : '',
  };
}
