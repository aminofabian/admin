import { beforeEach, describe, expect, it } from 'vitest';
import {
  readLastChatView,
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
