import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveChatUserForPlayerIdDeepLink } from '../resolve-chat-user-for-deep-link';

describe('resolveChatUserForPlayerIdDeepLink', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/player-details/')) {
          return {
            ok: true,
            json: async () => ({
              player: {
                id: 3648,
                username: 'Testme72',
                email: 't@example.com',
                balance: '10',
              },
            }),
          };
        }
        if (url.includes('chat-search-players')) {
          return {
            ok: true,
            json: async () => ({
              player: [
                {
                  user_id: 3648,
                  username: 'Testme72',
                  chatroom_id: 3603,
                  last_message: 'hi',
                },
              ],
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('merges chatroom_id from chat search when player-details omits it', async () => {
    const user = await resolveChatUserForPlayerIdDeepLink({
      userId: 3648,
      token: 'test-token',
    });
    expect(user).not.toBeNull();
    expect(user?.user_id).toBe(3648);
    expect(user?.id).toBe('3603');
    expect(user?.username).toBe('Testme72');
  });
});
