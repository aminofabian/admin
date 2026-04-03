import { describe, expect, it } from 'vitest';
import { transformChatToUser, transformPlayerToUser } from '../map-chat-api';

describe('map-chat-api', () => {
  describe('transformChatToUser', () => {
    it('should map flat REST chats[] row (player_id, player_username, last_message_timestamp)', () => {
      const row: Record<string, unknown> = {
        id: 81,
        name: 'P93Chat',
        player_id: 93,
        player_username: 'bitslotbeta',
        last_message: 'Welcome to Beta Bitslot!',
        last_message_sender: 92,
        last_message_timestamp: '2026-04-01T16:55:25.690042+00:00',
        unread_messages_count: 0,
      };

      const u = transformChatToUser(row);

      expect(u.id).toBe('81');
      expect(u.user_id).toBe(93);
      expect(u.username).toBe('bitslotbeta');
      expect(u.lastMessage).toBe('Welcome to Beta Bitslot!');
      expect(u.lastMessageTime).toBe('2026-04-01T16:55:25.690042+00:00');
      expect(u.unreadCount).toBe(0);
    });
  });

  describe('transformPlayerToUser', () => {
    it('should map player[] row from admin chat list including last_seen_at', () => {
      const row: Record<string, unknown> = {
        id: 93,
        username: 'bitslotbeta',
        chatroom_id: 81,
        last_message: 'Welcome to Beta Bitslot!',
        last_message_timestamp: '2026-04-01T16:55:25.690042+00:00',
        last_seen_at: '2026-04-03T14:41:10.956951+00:00',
        unread_messages_count: 0,
      };

      const u = transformPlayerToUser(row);

      expect(u.id).toBe('81');
      expect(u.user_id).toBe(93);
      expect(u.username).toBe('bitslotbeta');
      expect(u.playerLastSeenAt).toBe('2026-04-03T14:41:10.956951+00:00');
    });
  });
});
