/**
 * Returns a chatroom id safe for REST `chatroom_id` params.
 * Rejects values that equal the player user id (common mapping bug).
 */
export function resolveSafeChatroomId(
  chatId: string | number | null | undefined,
  userId: number | null | undefined,
): string | null {
  if (chatId === null || chatId === undefined) return null;
  const trimmed = String(chatId).trim();
  if (!trimmed) return null;
  if (userId != null && trimmed === String(userId)) return null;
  return trimmed;
}
