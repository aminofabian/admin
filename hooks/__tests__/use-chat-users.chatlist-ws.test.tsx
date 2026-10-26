import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, expect, it, beforeEach, afterEach } from 'vitest';

/**
 * Behavioural coverage for the chat-list WebSocket contract.
 *
 * These are the "done when" cases from the Unreplied handoff. The pure list
 * helpers are covered separately; this file exercises the event dispatch in
 * `useChatUsers`, where an early return or a mis-ordered branch can silently
 * drop the server's `is_unreplied` flag. The last case covers the manual
 * refresh contract: the directory cache must only be bypassed on demand.
 */

const { captured } = vi.hoisted(() => ({
  captured: [] as Array<{ listeners: { onMessage: (payload: unknown) => void } }>,
}));

vi.mock('@/lib/websocket-manager', () => ({
  websocketManager: {
    connect: (_opts: unknown, listeners: unknown) => {
      captured.push({
        listeners: listeners as { onMessage: (payload: unknown) => void },
      });
    },
    disconnect: vi.fn(),
  },
  createFreshAuthenticatedWebSocketUrl: async () => 'wss://test/ws/chatlist/',
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}));

import { useChatUsers } from '../use-chat-users';

function send(payload: Record<string, unknown>) {
  act(() => {
    captured[captured.length - 1].listeners.onMessage(payload);
  });
}

async function mount() {
  const rendered = renderHook(() => useChatUsers({ adminId: 1 }));
  await waitFor(() => expect(captured.length).toBeGreaterThan(0));
  return rendered;
}

const onlineRow = (overrides: Record<string, unknown> = {}) => ({
  chat_id: 57,
  user_id: 67,
  username: 'testme7',
  is_online: true,
  ...overrides,
});

describe('useChatUsers — chat-list socket contract', () => {
  beforeEach(() => {
    captured.length = 0;
  });

  it('seeds Online and Unreplied from add_new_chats', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      online: [onlineRow()],
      unreplied: [onlineRow({ is_unreplied: true })],
    });

    expect(result.current.onlineChats.map((c) => c.user_id)).toEqual([67]);
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67]);
  });

  it('keeps the seed when the legacy recent list is also present', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      online: [onlineRow(), onlineRow({ chat_id: 58, user_id: 68, username: 'other' })],
      unreplied: [onlineRow({ is_unreplied: true })],
      // Legacy list is partial and carries no is_unreplied flag.
      chats: [onlineRow({ chat_id: 58, user_id: 68, username: 'other' })],
    });

    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67]);
    expect(result.current.onlineChats.map((c) => c.user_id).sort()).toEqual([67, 68]);
  });

  it('upserts, re-orders and removes from Unreplied on re_arrange', async () => {
    const { result } = await mount();

    send({ type: 're_arrange', ...onlineRow({ last_message_timestamp: '2026-10-25T10:00:00Z' }), is_unreplied: true });
    send({ type: 're_arrange', ...onlineRow({ chat_id: 58, user_id: 68, last_message_timestamp: '2026-10-25T10:05:00Z' }), is_unreplied: true });
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([68, 67]);

    // A newer message from 67 moves it back to the top.
    send({ type: 're_arrange', ...onlineRow({ last_message_timestamp: '2026-10-25T10:10:00Z', unread_messages_count: 2 }), is_unreplied: true, last_message: 'again' });
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67, 68]);

    // Staff reply clears the flag and the row leaves the tab.
    send({ type: 're_arrange', ...onlineRow(), is_unreplied: false });
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([68]);
  });

  it('drops a staff reply from Unreplied once, even if the socket confirms later', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      online: [onlineRow(), onlineRow({ chat_id: 58, user_id: 68, username: 'other' })],
      unreplied: [
        onlineRow({ is_unreplied: true }),
        onlineRow({ chat_id: 58, user_id: 68, username: 'other', is_unreplied: true }),
      ],
    });

    act(() => {
      result.current.acknowledgeStaffReply(67);
    });

    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([68]);
    expect(result.current.chatListUnrepliedPlayersCount).toBe(1);
    // Still online — a reply does not imply offline.
    expect(result.current.onlineChats.map((c) => c.user_id).sort()).toEqual([67, 68]);

    // The confirming re_arrange must not decrement again.
    send({ type: 're_arrange', ...onlineRow(), is_unreplied: false, is_online: true });
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([68]);
    expect(result.current.chatListUnrepliedPlayersCount).toBe(1);

    // Another agent replying clears the remaining row the same way.
    send({
      type: 're_arrange',
      ...onlineRow({ chat_id: 58, user_id: 68 }),
      is_unreplied: false,
      is_online: true,
    });
    expect(result.current.unrepliedChats).toHaveLength(0);
    expect(result.current.chatListUnrepliedPlayersCount).toBe(0);
    expect(result.current.onlineChats.map((c) => c.user_id).sort()).toEqual([67, 68]);
  });

  it('keeps Unreplied stable when the All Players directory is fetched', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          player: [
            {
              id: 99,
              chatroom_id: 90,
              username: 'directory-only',
              is_unreplied: true,
              is_online: false,
            },
          ],
          counts: {
            unreplied_players_count: 0,
            online_players_count: 1,
            all_players_count: 1,
          },
          pagination: { page: 1, total_pages: 1, has_next: false },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = await mount();
    send({
      type: 'add_new_chats',
      unreplied: [
        onlineRow({ is_unreplied: true }),
        onlineRow({ chat_id: 58, user_id: 68, username: 'other', is_unreplied: true }),
      ],
    });

    const before = result.current.unrepliedChats.map((c) => c.user_id);
    expect(result.current.chatListUnrepliedPlayersCount).toBe(2);

    await act(async () => {
      await result.current.fetchAllPlayers({ force: true });
    });

    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual(before);
    expect(result.current.chatListUnrepliedPlayersCount).toBe(2);
    expect(result.current.allPlayers.map((p) => p.user_id)).toEqual([99]);

    vi.unstubAllGlobals();
  });

  it('remembers a socket offline so Online membership can drop them', async () => {
    const { result } = await mount();
    send({
      type: 'add_new_chats',
      online: [onlineRow(), onlineRow({ chat_id: 58, user_id: 68, username: 'other' })],
    });

    send({ type: 're_arrange', ...onlineRow(), is_online: false });

    expect(result.current.onlineChats.map((c) => c.user_id)).toEqual([68]);
    expect(result.current.socketOfflineUserIds).toEqual([67]);
  });

  it('keeps Unreplied list and badge count atomic on reply', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      unreplied: [
        onlineRow({ is_unreplied: true }),
        onlineRow({ chat_id: 58, user_id: 68, username: 'other', is_unreplied: true }),
      ],
    });

    expect(result.current.unrepliedListLive).toBe(true);
    expect(result.current.unrepliedChats).toHaveLength(2);
    expect(result.current.chatListUnrepliedPlayersCount).toBe(2);

    send({ type: 're_arrange', ...onlineRow(), is_unreplied: false });

    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([68]);
    expect(result.current.chatListUnrepliedPlayersCount).toBe(1);
  });

  it('does not wipe a REST unreplied seed with an empty socket unreplied array', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            player: [
              {
                id: 67,
                chatroom_id: 57,
                username: 'seeded',
                is_unreplied: true,
                is_online: false,
              },
              {
                id: 68,
                chatroom_id: 58,
                username: 'seeded2',
                is_unreplied: true,
                is_online: false,
              },
            ],
            counts: {
              unreplied_players_count: 8,
              online_players_count: 0,
              all_players_count: 2,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = await mount();
    await waitFor(() =>
      expect(result.current.unrepliedChats.map((c) => c.user_id).sort()).toEqual([
        67, 68,
      ]),
    );
    expect(result.current.unrepliedListLive).toBe(false);

    // Empty unreplied before a real socket seed must not flash the badge to 0.
    send({ type: 'add_new_chats', online: [], unreplied: [] });

    expect(result.current.unrepliedChats.map((c) => c.user_id).sort()).toEqual([
      67, 68,
    ]);
    expect(result.current.unrepliedListLive).toBe(false);

    vi.unstubAllGlobals();
  });

  it('applies re_arrange even when it carries a top-level balance', async () => {
    const { result } = await mount();

    send({ type: 're_arrange', ...onlineRow(), balance: 100, is_unreplied: true });

    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67]);
    expect(result.current.unrepliedChats[0].balance).toBe('100');
  });

  it('accepts re_arrange nested under message', async () => {
    const { result } = await mount();

    send({ message: { type: 're_arrange', ...onlineRow(), is_unreplied: true } });

    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67]);
  });

  it('does not clear Unreplied on a bare message event', async () => {
    const { result } = await mount();
    send({ type: 'add_new_chats', unreplied: [onlineRow({ is_unreplied: true })] });

    send({ type: 'message', player_id: 67, message: 'system notice' });

    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67]);
  });

  it('clears the unread badge on a read receipt without leaving Unreplied', async () => {
    const { result } = await mount();
    send({
      type: 'add_new_chats',
      online: [onlineRow({ unread_messages_count: 3 })],
      unreplied: [onlineRow({ unread_messages_count: 3, is_unreplied: true })],
    });

    send({ type: 'mark_message_as_read', chat_id: 57 });

    expect(result.current.unrepliedChats.map((c) => c.unreadCount)).toEqual([0]);
    expect(result.current.onlineChats.map((c) => c.unreadCount)).toEqual([0]);
    // Membership survives: only a human reply clears Unreplied.
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67]);
  });

  it('keeps list order on a read receipt but still surfaces a new message', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      unreplied: [
        onlineRow({ chat_id: 57, user_id: 67, username: 'newer', last_message_timestamp: '2026-10-25T10:32:00Z', is_unreplied: true }),
        onlineRow({ chat_id: 58, user_id: 68, username: 'older', last_message_timestamp: '2026-10-25T10:21:00Z', is_unreplied: true }),
      ],
    });
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67, 68]);

    // Opening the older chat marks it read; the server re-announces it with an
    // unchanged last-message time. The row must not jump under the cursor.
    send({
      type: 're_arrange',
      chat_id: 58,
      user_id: 68,
      username: 'older',
      last_message_timestamp: '2026-10-25T10:21:00Z',
      unread_messages_count: 0,
      is_unreplied: true,
      is_online: true,
    });
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67, 68]);
    expect(result.current.unrepliedChats[1].unreadCount).toBe(0);

    // A genuinely newer message still sorts to the top.
    send({
      type: 're_arrange',
      chat_id: 58,
      user_id: 68,
      username: 'older',
      last_message: 'new one',
      last_message_timestamp: '2026-10-25T10:40:00Z',
      unread_messages_count: 1,
      is_unreplied: true,
      is_online: true,
    });
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([68, 67]);
  });

  it('does not reorder when a read receipt re-sends the same message with a bumped time', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      unreplied: [
        onlineRow({ chat_id: 57, user_id: 67, username: 'newer', last_message: 'hello', last_message_timestamp: '2026-10-25T10:32:00Z', is_unreplied: true }),
        onlineRow({ chat_id: 58, user_id: 68, username: 'older', last_message: 'older text', last_message_timestamp: '2026-10-25T10:21:00Z', is_unreplied: true }),
      ],
    });
    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67, 68]);

    send({
      type: 're_arrange',
      chat_id: 58,
      user_id: 68,
      username: 'older',
      last_message: 'older text',
      last_message_timestamp: '2026-10-25T10:26:00Z',
      unread_messages_count: 0,
      is_unreplied: true,
    });

    expect(result.current.unrepliedChats.map((c) => c.user_id)).toEqual([67, 68]);
  });

  it('updates the preview without reordering when the open chat reports a message', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      online: [
        onlineRow({ chat_id: 57, user_id: 67, username: 'newer', last_message_timestamp: '2026-10-25T10:32:00Z' }),
        onlineRow({ chat_id: 58, user_id: 68, username: 'older', last_message_timestamp: '2026-10-25T10:21:00Z' }),
      ],
    });
    expect(result.current.users.map((c) => c.user_id)).toEqual([67, 68]);

    act(() => {
      result.current.updateChatLastMessage(68, '58', 'fresh reply', '2026-10-25T10:59:00Z');
    });

    expect(result.current.users.map((c) => c.user_id)).toEqual([67, 68]);
    expect(result.current.users[1].lastMessage).toBe('fresh reply');
  });

  it('does not reorder when a read receipt arrives as update_chat', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      online: [
        onlineRow({ chat_id: 57, user_id: 67, username: 'newer', last_message: 'newer text', last_message_timestamp: '2026-10-25T10:32:00Z' }),
        onlineRow({ chat_id: 58, user_id: 68, username: 'older', last_message: 'older text', last_message_timestamp: '2026-10-25T10:21:00Z' }),
      ],
    });
    expect(result.current.users.map((c) => c.user_id)).toEqual([67, 68]);

    // Read receipt: the last message is echoed back with no new timestamp.
    send({
      type: 'update_chat',
      chat_id: 58,
      user_id: 68,
      last_message: 'older text',
      unread_messages_count: 0,
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    });

    expect(result.current.users.map((c) => c.user_id)).toEqual([67, 68]);
    expect(result.current.users[1].unreadCount).toBe(0);
  });

  it('moves a row to the top when update_chat carries a newer message', async () => {
    const { result } = await mount();

    send({
      type: 'add_new_chats',
      online: [
        onlineRow({ chat_id: 58, user_id: 68, username: 'older', last_message_timestamp: '2026-10-25T10:20:00Z' }),
        onlineRow({ chat_id: 57, user_id: 67, username: 'newer', last_message_timestamp: '2026-10-25T10:10:00Z' }),
      ],
    });
    expect(result.current.users.map((c) => c.user_id)).toEqual([68, 67]);

    send({
      type: 'update_chat',
      chat_id: 57,
      user_id: 67,
      last_message: 'brand new',
      last_message_timestamp: '2026-10-25T10:40:00Z',
      unread_messages_count: 1,
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    });

    expect(result.current.users.map((c) => c.user_id)).toEqual([67, 68]);
    expect(result.current.users[0].lastMessage).toBe('brand new');
  });

  it('removes a chat from every list on remove_chat_from_list', async () => {
    const { result } = await mount();
    send({
      type: 'add_new_chats',
      online: [onlineRow()],
      unreplied: [onlineRow({ is_unreplied: true })],
    });

    send({ type: 'remove_chat_from_list', chat_id: 57, user_id: 67 });

    expect(result.current.onlineChats).toHaveLength(0);
    expect(result.current.unrepliedChats).toHaveLength(0);
    expect(result.current.users).toHaveLength(0);
  });
});

describe('useChatUsers — directory refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves the cache for a tab open and bypasses it for a manual refresh', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            player: [
              {
                id: 67,
                chatroom_id: 57,
                username: 'testme7',
                is_online: true,
                unread_messages_count: 0,
              },
            ],
            pagination: { page: 1, total_pages: 1, has_next: false },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = await mount();

    // Mount seeds Unreplied from REST before the directory load.
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1));
    const seedCalls = fetchMock.mock.calls.length;

    // Tab open: one directory request (on top of the unreplied seed).
    await act(async () => {
      await result.current.fetchAllPlayers();
    });
    expect(fetchMock).toHaveBeenCalledTimes(seedCalls + 1);
    expect(result.current.allPlayers.map((p) => p.user_id)).toEqual([67]);

    // Opening another tab back within the TTL is served from the cache.
    await act(async () => {
      await result.current.fetchAllPlayers();
    });
    expect(fetchMock).toHaveBeenCalledTimes(seedCalls + 1);

    // Manual refresh must hit the network.
    await act(async () => {
      await result.current.fetchAllPlayers({ force: true });
    });
    expect(fetchMock).toHaveBeenCalledTimes(seedCalls + 2);
  });
});
