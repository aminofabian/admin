import { beforeEach, describe, expect, it } from 'vitest';
import {
  ensureSelectedPlayerVisible,
  readLastChatView,
  resolveInitialChatTab,
  writeLastChatView,
} from '../chat-view-state';

describe('chat view state', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('round-trips the tab and player', () => {
    writeLastChatView({ tab: 'online', playerId: 67 });

    expect(readLastChatView()).toEqual({ tab: 'online', playerId: 67 });
  });

  it('returns null when nothing was stored', () => {
    expect(readLastChatView()).toBeNull();
  });

  it('drops a corrupted entry instead of throwing', () => {
    window.sessionStorage.setItem('chat:lastView', '{not json');

    expect(readLastChatView()).toBeNull();
  });

  it('rejects an unknown tab', () => {
    window.sessionStorage.setItem(
      'chat:lastView',
      JSON.stringify({ tab: 'bogus', playerId: 67 }),
    );

    expect(readLastChatView()).toBeNull();
  });

  it('normalises a missing player id to null', () => {
    window.sessionStorage.setItem(
      'chat:lastView',
      JSON.stringify({ tab: 'unreplied', playerId: 'not-a-number' }),
    );

    expect(readLastChatView()).toEqual({ tab: 'unreplied', playerId: null });
  });
});

describe('resolveInitialChatTab', () => {
  it('defaults to online when nothing is stored', () => {
    expect(resolveInitialChatTab(null, null)).toBe('online');
  });

  it('restores the stored tab when the URL matches', () => {
    expect(
      resolveInitialChatTab({ tab: 'unreplied', playerId: 12 }, 12),
    ).toBe('unreplied');
  });

  it('opens All Players for an external deep link', () => {
    expect(
      resolveInitialChatTab({ tab: 'online', playerId: 12 }, 99),
    ).toBe('all-chats');
    expect(resolveInitialChatTab(null, 99)).toBe('all-chats');
  });
});

describe('ensureSelectedPlayerVisible', () => {
  const alice = { user_id: 1 };
  const bob = { user_id: 2 };

  it('returns the list unchanged when the selection is already present', () => {
    expect(ensureSelectedPlayerVisible([alice, bob], alice)).toEqual([
      alice,
      bob,
    ]);
  });

  it('prepends a missing selection so the open chat stays highlighted', () => {
    expect(ensureSelectedPlayerVisible([alice], bob)).toEqual([bob, alice]);
  });

  it('ignores a null selection', () => {
    expect(ensureSelectedPlayerVisible([alice], null)).toEqual([alice]);
  });
});
