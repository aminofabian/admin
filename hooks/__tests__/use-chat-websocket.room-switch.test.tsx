import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The sidebar copies the open thread onto the selected row from the same
 * render that changes the selection. History used to be cleared in an effect,
 * so that render still held the previous room's messages and the row flashed
 * the other conversation's last line until the new history arrived.
 */

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}));

vi.mock('@/lib/websocket-manager', () => ({
  websocketManager: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(() => false),
  },
  createFreshAuthenticatedWebSocketUrl: vi.fn(async () => 'wss://test/ws/cschat/'),
}));

import { useChatWebSocket } from '../use-chat-websocket';

interface SeenRender {
  userId: number;
  chatId: string;
  texts: string[];
  done: boolean;
  roomKey: string | null;
}

function historyResponse(room: string | null) {
  const text =
    room === '10'
      ? 'from player one'
      : room === '20'
        ? 'from player two'
        : 'from player three';
  return {
    ok: true,
    status: 200,
    json: async () => ({
      messages: [
        {
          id: `m-${room}`,
          message: text,
          sent_time: '2026-10-25T10:00:00Z',
          sender_id: 1,
          type: 'message',
        },
      ],
      page: 1,
      total_pages: 1,
    }),
    text: async () => '',
  };
}

function Probe({
  userId,
  chatId,
  seen,
}: {
  userId: number;
  chatId: string;
  seen: SeenRender[];
}) {
  const { messages, hasCompletedInitialHistory, messagesRoomKey } = useChatWebSocket({
    userId,
    chatId,
    adminId: 1,
    enabled: true,
  });

  useEffect(() => {
    seen.push({
      userId,
      chatId,
      texts: messages.map((message) => message.text),
      done: hasCompletedInitialHistory,
      roomKey: messagesRoomKey,
    });
  });

  return null;
}

describe('useChatWebSocket room switch', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise((resolve, reject) => {
          const fail = () => reject(new DOMException('Aborted', 'AbortError'));
          if (init?.signal?.aborted) {
            fail();
            return;
          }
          const timer = setTimeout(() => {
            const room = new URL(String(input), 'http://localhost').searchParams.get(
              'chatroom_id',
            );
            resolve(historyResponse(room));
          }, 0);
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            fail();
          });
        });
      }),
    );
  });

  it('does not keep the previous room loaded on the render that selects the next one', async () => {
    const seen: SeenRender[] = [];
    const view = render(<Probe userId={1} chatId="10" seen={seen} />);

    await waitFor(() => {
      expect(
        seen.some(
          (entry) =>
            entry.userId === 1 &&
            entry.done &&
            entry.roomKey === '1:10' &&
            entry.texts.includes('from player one'),
        ),
      ).toBe(true);
    });

    view.rerender(<Probe userId={2} chatId="20" seen={seen} />);

    expect(
      seen.filter(
        (entry) => entry.userId === 2 && entry.texts.includes('from player one'),
      ),
    ).toEqual([]);

    const switched = seen.filter((entry) => entry.userId === 2);
    expect(switched.length).toBeGreaterThan(0);
    expect(switched[0]?.texts).toEqual([]);
    expect(switched[0]?.done).toBe(false);
    expect(switched[0]?.roomKey).toBeNull();

    await waitFor(() => {
      expect(
        seen.some(
          (entry) =>
            entry.userId === 2 &&
            entry.done &&
            entry.roomKey === '2:20' &&
            entry.texts.includes('from player two'),
        ),
      ).toBe(true);
    });

    expect(
      seen.filter(
        (entry) => entry.userId === 2 && entry.texts.includes('from player one'),
      ),
    ).toEqual([]);
  });

  it('drops in-flight history when chats are switched again before it returns', async () => {
    const seen: SeenRender[] = [];
    const view = render(<Probe userId={1} chatId="10" seen={seen} />);

    await waitFor(() => {
      expect(seen.some((entry) => entry.texts.includes('from player one'))).toBe(true);
    });

    view.rerender(<Probe userId={2} chatId="20" seen={seen} />);
    view.rerender(<Probe userId={3} chatId="30" seen={seen} />);

    await waitFor(() => {
      expect(
        seen.some(
          (entry) =>
            entry.userId === 3 &&
            entry.done &&
            entry.roomKey === '3:30' &&
            entry.texts.includes('from player three'),
        ),
      ).toBe(true);
    });

    expect(
      seen.filter(
        (entry) =>
          entry.userId === 3 &&
          (entry.texts.includes('from player one') ||
            entry.texts.includes('from player two')),
      ),
    ).toEqual([]);
  });
});
