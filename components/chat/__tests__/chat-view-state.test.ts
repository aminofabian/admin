import { beforeEach, describe, expect, it } from 'vitest';
import {
  ensureSelectedPlayerVisible,
  readLastChatView,
  resolveInitialChatTab,
  resolveOnlineBadgeCount,
  resolveUnrepliedBadgeCount,
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

describe('resolveUnrepliedBadgeCount', () => {
  it('shows the count the chat-list socket sent', () => {
    expect(resolveUnrepliedBadgeCount({ socketCount: 3 })).toBe(3);
  });

  it('stays blank until the socket sends a count', () => {
    expect(resolveUnrepliedBadgeCount({ socketCount: null })).toBeNull();
  });

  it('shows 0 when the socket says nobody is unreplied', () => {
    expect(resolveUnrepliedBadgeCount({ socketCount: 0 })).toBe(0);
  });
});

describe('resolveOnlineBadgeCount', () => {
  it('keeps the visible number while a chat is still on screen', () => {
    expect(
      resolveOnlineBadgeCount({
        socketCount: 2,
        visibleCount: 3,
        fallbackCount: 2,
      }),
    ).toBe(3);
  });

  it('shows the socket count once the extra chat is gone', () => {
    expect(
      resolveOnlineBadgeCount({
        socketCount: 2,
        visibleCount: 2,
        fallbackCount: 9,
      }),
    ).toBe(2);
  });

  it('shows a rising count before the new chat is painted', () => {
    expect(
      resolveOnlineBadgeCount({
        socketCount: 3,
        visibleCount: 2,
        fallbackCount: 2,
      }),
    ).toBe(3);
  });

  it('uses the earlier total until the socket sends a count', () => {
    expect(
      resolveOnlineBadgeCount({
        socketCount: null,
        visibleCount: 0,
        fallbackCount: 4,
      }),
    ).toBe(4);
  });
});
