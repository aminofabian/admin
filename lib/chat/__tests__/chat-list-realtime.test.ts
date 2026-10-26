import { describe, expect, it } from 'vitest';
import {
  clearUnreadChatRow,
  mergeChatRow,
  pickNewerPreview,
  reconcileChatSnapshot,
  patchChatRow,
  removeChatRow,
  removeChatRowByRef,
  sortChatsByRecency,
  upsertChatRowByLatestMessage,
} from '../chat-list-realtime';
import type { ChatUser } from '@/types';

const row = (overrides: Partial<ChatUser> = {}): ChatUser => ({
  id: '57',
  user_id: 67,
  username: 'testme7',
  email: '',
  isOnline: false,
  unreadCount: 1,
  lastMessage: 'hello',
  lastMessageTime: '2026-10-25T10:00:00Z',
  ...overrides,
});

describe('chat-list-realtime', () => {
  describe('mergeChatRow', () => {
    it('keeps notes and winnings the partial payload omitted', () => {
      const merged = mergeChatRow(
        row({ notes: 'VIP', winningBalance: '12.50', isUnreplied: true }),
        row({ lastMessage: 'newer' }),
      );

      expect(merged.notes).toBe('VIP');
      expect(merged.winningBalance).toBe('12.50');
      expect(merged.lastMessage).toBe('newer');
      expect(merged.isUnreplied).toBe(true);
    });

    it('keeps the previous message time when the update has none', () => {
      const merged = mergeChatRow(
        row({ lastMessageTime: '2026-10-25T10:00:00Z' }),
        row({ lastMessageTime: undefined }),
      );
      expect(merged.lastMessageTime).toBe('2026-10-25T10:00:00Z');
    });
  });

  describe('upsertChatRowByLatestMessage', () => {
    it('adds a new row at the top', () => {
      const next = upsertChatRowByLatestMessage([row({ user_id: 1, id: '1' })], row());

      expect(next.map((chat) => chat.user_id)).toEqual([67, 1]);
    });

    it('moves an existing row to the top when its last message is newer', () => {
      const next = upsertChatRowByLatestMessage(
        [row({ user_id: 1, id: '1' }), row({ unreadCount: 0, lastMessage: 'old', lastMessageTime: '2026-10-25T09:00:00Z' })],
        row({ unreadCount: 3, lastMessage: 'latest', lastMessageTime: '2026-10-25T10:00:00Z' }),
      );

      expect(next).toHaveLength(2);
      expect(next[0].user_id).toBe(67);
      expect(next[0].unreadCount).toBe(3);
      expect(next[0].lastMessage).toBe('latest');
    });

    it('patches in place when a read receipt reuses the same message time', () => {
      const next = upsertChatRowByLatestMessage(
        [row({ user_id: 1, id: '1' }), row({ unreadCount: 2 })],
        row({ unreadCount: 0 }),
      );

      expect(next.map((chat) => chat.user_id)).toEqual([1, 67]);
      expect(next[1].unreadCount).toBe(0);
    });

    it('does not reorder when the payload carries no timestamp', () => {
      const next = upsertChatRowByLatestMessage(
        [row({ user_id: 1, id: '1' }), row({ lastMessageTime: '2026-10-25T10:00:00Z' })],
        row({ lastMessageTime: undefined, unreadCount: 0 }),
      );

      expect(next.map((chat) => chat.user_id)).toEqual([1, 67]);
    });

    it('moves a repeated message when the unread count rises', () => {
      const next = upsertChatRowByLatestMessage(
        [row({ user_id: 1, id: '1' }), row({ lastMessage: 'hello', unreadCount: 0 })],
        row({ lastMessage: 'hello', unreadCount: 1 }),
      );

      expect(next.map((chat) => chat.user_id)).toEqual([67, 1]);
    });

    it('does not reorder when the same message is re-announced with a fresh timestamp', () => {
      const next = upsertChatRowByLatestMessage(
        [row({ user_id: 1, id: '1' }), row({ lastMessage: 'hello', lastMessageTime: '2026-10-25T10:00:00Z' })],
        row({ lastMessage: 'hello', lastMessageTime: '2026-10-25T10:06:00Z' }),
      );

      expect(next.map((chat) => chat.user_id)).toEqual([1, 67]);
    });

    it('preserves the existing online flag when the payload omitted it', () => {
      const next = upsertChatRowByLatestMessage(
        [row({ isOnline: true })],
        row({ isOnline: false }),
      );
      expect(next[0].isOnline).toBe(true);
    });

    it('ignores unusable rows', () => {
      const list = [row()];
      expect(upsertChatRowByLatestMessage(list, row({ id: '', user_id: 0 }))).toBe(list);
    });
  });

  describe('reconcileChatSnapshot', () => {
    it('keeps the visible order even when the snapshot is reordered', () => {
      const first = row({ user_id: 1, id: '1' });
      const second = row({ user_id: 2, id: '2' });

      const next = reconcileChatSnapshot([first, second], [second, first]);

      expect(next.map((chat) => chat.user_id)).toEqual([1, 2]);
    });

    it('prepends rows that were not on screen', () => {
      const first = row({ user_id: 1, id: '1' });
      const added = row({ user_id: 9, id: '9' });

      const next = reconcileChatSnapshot([first], [first, added]);

      expect(next.map((chat) => chat.user_id)).toEqual([9, 1]);
    });

    it('drops rows that left the snapshot', () => {
      const first = row({ user_id: 1, id: '1' });
      const gone = row({ user_id: 2, id: '2' });

      const next = reconcileChatSnapshot([first, gone], [first]);

      expect(next.map((chat) => chat.user_id)).toEqual([1]);
    });

    it('adopts the snapshot wholesale on the first seed', () => {
      const snapshot = [row({ user_id: 2, id: '2' }), row({ user_id: 1, id: '1' })];
      expect(reconcileChatSnapshot([], snapshot)).toBe(snapshot);
    });
  });

  describe('patchChatRow', () => {
    it('patches a loaded All Players row in place without reordering', () => {
      const first = row({ user_id: 1, id: '1' });
      const second = row();
      const next = patchChatRow([first, second], row({ balance: '99.00' }));

      expect(next.map((chat) => chat.user_id)).toEqual([1, 67]);
      expect(next[1].balance).toBe('99.00');
    });

    it('does not insert a row that is not loaded', () => {
      const list = [row({ user_id: 1, id: '1' })];
      expect(patchChatRow(list, row())).toBe(list);
    });
  });

  describe('removeChatRow', () => {
    it('removes the row flagged is_unreplied = false', () => {
      const next = removeChatRow([row({ user_id: 1, id: '1' }), row()], row());
      expect(next.map((chat) => chat.user_id)).toEqual([1]);
    });

    it('keeps the list identity when there is nothing to remove', () => {
      const list = [row({ user_id: 1, id: '1' })];
      expect(removeChatRow(list, row())).toBe(list);
    });
  });

  describe('removeChatRowByRef', () => {
    it('removes by chatroom id', () => {
      const next = removeChatRowByRef([row({ user_id: 1, id: '1' }), row()], {
        chatId: 57,
      });
      expect(next.map((chat) => chat.user_id)).toEqual([1]);
    });

    it('removes by player id', () => {
      const next = removeChatRowByRef([row({ user_id: 1, id: '1' }), row()], {
        userId: 67,
      });
      expect(next.map((chat) => chat.user_id)).toEqual([1]);
    });
  });

  describe('clearUnreadChatRow', () => {
    it('clears the badge by chatroom id without touching membership', () => {
      const next = clearUnreadChatRow(
        [row({ unreadCount: 4, isUnreplied: true })],
        { chatId: 57 },
      );

      expect(next[0].unreadCount).toBe(0);
      expect(next[0].isUnreplied).toBe(true);
    });

    it('clears the badge by player id when the chatroom id is absent', () => {
      const next = clearUnreadChatRow([row({ unreadCount: 2 })], { userId: 67 });
      expect(next[0].unreadCount).toBe(0);
    });

    it('keeps the list identity when nothing matches', () => {
      const list = [row({ unreadCount: 2 })];
      expect(clearUnreadChatRow(list, { userId: 999 })).toBe(list);
    });

    it('does not allocate when the badge is already zero', () => {
      const list = [row({ unreadCount: 0 })];
      expect(clearUnreadChatRow(list, { chatId: 57 })).toBe(list);
    });
  });

  describe('pickNewerPreview', () => {
    it('keeps the newer stamp when the incoming preview is older', () => {
      const picked = pickNewerPreview(
        row({ lastMessage: 'today', lastMessageTime: '2026-10-26T09:10:00Z' }),
        { lastMessage: 'welcome', lastMessageTime: '2026-04-05T12:00:00Z' },
      );
      expect(picked.lastMessage).toBe('today');
      expect(picked.lastMessageTime).toBe('2026-10-26T09:10:00Z');
    });

    it('takes the incoming preview when it is newer', () => {
      const picked = pickNewerPreview(
        row({ lastMessage: 'welcome', lastMessageTime: '2026-04-05T12:00:00Z' }),
        { lastMessage: 'hello', lastMessageTime: '2026-10-26T09:10:00Z' },
      );
      expect(picked.lastMessage).toBe('hello');
      expect(picked.lastMessageTime).toBe('2026-10-26T09:10:00Z');
    });
  });

  describe('sortChatsByRecency', () => {
    it('orders newest first', () => {
      const sorted = sortChatsByRecency([
        row({ user_id: 1, lastMessageTime: '2026-02-28T00:00:00Z' }),
        row({ user_id: 2, lastMessageTime: '2026-10-26T09:10:00Z' }),
      ]);
      expect(sorted.map((chat) => chat.user_id)).toEqual([2, 1]);
    });
  });
});
