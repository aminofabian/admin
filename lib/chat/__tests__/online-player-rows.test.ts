import { describe, expect, it } from 'vitest';
import { mergeOnlinePlayerRows } from '../online-player-rows';
import type { ChatUser } from '@/types';

const row = (overrides: Partial<ChatUser> = {}): ChatUser => ({
  id: '57',
  user_id: 67,
  username: 'testme7',
  email: '',
  isOnline: true,
  unreadCount: 1,
  lastMessage: 'hello',
  lastMessageTime: '2026-10-25T10:00:00Z',
  ...overrides,
});

describe('mergeOnlinePlayerRows', () => {
  it('shows the REST online players a partial socket list would hide', () => {
    const merged = mergeOnlinePlayerRows({
      socketRows: [row({ user_id: 67, id: '57' })],
      restRows: [
        row({ user_id: 67, id: '57' }),
        row({ user_id: 68, id: '58', username: 'other' }),
        row({ user_id: 69, id: '59', username: 'third' }),
      ],
      chatListRows: [],
    });

    // The click that produced the single socket row must not drop the rest.
    expect(merged.map((player) => player.user_id)).toEqual([67, 68, 69]);
  });

  it('lets socket realtime fields win while keeping REST detail', () => {
    const merged = mergeOnlinePlayerRows({
      socketRows: [
        row({
          user_id: 67,
          id: '57',
          lastMessage: 'socket message',
          unreadCount: 0,
          lastMessageTime: '2026-10-25T10:05:00Z',
        }),
      ],
      restRows: [
        row({
          user_id: 67,
          id: '57',
          notes: 'VIP',
          balance: '12.50',
          lastMessage: 'rest message',
          unreadCount: 3,
          lastMessageTime: '2026-10-25T09:00:00Z',
        }),
      ],
      chatListRows: [],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      user_id: 67,
      lastMessage: 'socket message',
      unreadCount: 0,
      lastMessageTime: '2026-10-25T10:05:00Z',
      notes: 'VIP',
      balance: '12.50',
      isOnline: true,
    });
  });

  it('keeps the REST chatroom id when the socket row omits one', () => {
    const merged = mergeOnlinePlayerRows({
      socketRows: [row({ id: '' })],
      restRows: [row({ id: '57' })],
      chatListRows: [],
    });

    expect(merged[0].id).toBe('57');
  });

  it('falls back to online chat-list rows when the other sources are empty', () => {
    const merged = mergeOnlinePlayerRows({
      socketRows: [],
      restRows: [],
      chatListRows: [
        row({ user_id: 67, isOnline: true }),
        row({ user_id: 68, id: '58', isOnline: false }),
      ],
    });

    expect(merged.map((player) => player.user_id)).toEqual([67]);
  });

  it('does not resurrect a player the socket marked offline', () => {
    const merged = mergeOnlinePlayerRows({
      socketRows: [row({ user_id: 68, id: '58', username: 'still-online' })],
      restRows: [
        row({ user_id: 67, id: '57', username: 'went-offline' }),
        row({ user_id: 68, id: '58' }),
      ],
      chatListRows: [],
      excludeUserIds: new Set([67]),
    });

    expect(merged.map((player) => player.user_id)).toEqual([68]);
  });

  it('skips REST rows that are explicitly offline', () => {
    const merged = mergeOnlinePlayerRows({
      socketRows: [],
      restRows: [
        row({ user_id: 67, isOnline: false }),
        row({ user_id: 68, id: '58', isOnline: true }),
      ],
      chatListRows: [],
    });

    expect(merged.map((player) => player.user_id)).toEqual([68]);
  });

  it('ignores rows without a usable player id', () => {
    const merged = mergeOnlinePlayerRows({
      socketRows: [row({ user_id: 0, id: 'orphan' })],
      restRows: [row({ user_id: 68, id: '58' })],
      chatListRows: [],
    });

    expect(merged.map((player) => player.user_id)).toEqual([68]);
  });
});
