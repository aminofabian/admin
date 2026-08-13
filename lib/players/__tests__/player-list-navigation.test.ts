import { describe, expect, it } from 'vitest';
import {
  hasEnoughScannedContext,
  pickAdjacentPlayerId,
} from '../player-list-navigation';

// The players list is returned newest-first, so ids descend rather than ascend.
const ORDERED_IDS = [11544, 11515, 11504, 11498];

describe('pickAdjacentPlayerId', () => {
  it('follows list order instead of numeric id order', () => {
    expect(pickAdjacentPlayerId(ORDERED_IDS, 11515, 'next')).toEqual({
      status: 'ok',
      id: 11504,
    });
    expect(pickAdjacentPlayerId(ORDERED_IDS, 11515, 'previous')).toEqual({
      status: 'ok',
      id: 11544,
    });
  });

  it('reports the ends of the list', () => {
    expect(pickAdjacentPlayerId(ORDERED_IDS, 11544, 'previous')).toEqual({ status: 'end' });
    expect(pickAdjacentPlayerId(ORDERED_IDS, 11498, 'next')).toEqual({ status: 'end' });
  });

  it('reports when the current player is not part of the filtered list', () => {
    expect(pickAdjacentPlayerId(ORDERED_IDS, 999, 'next')).toEqual({ status: 'not-in-list' });
    expect(pickAdjacentPlayerId([], 11544, 'next')).toEqual({ status: 'not-in-list' });
  });
});

describe('hasEnoughScannedContext', () => {
  it('needs the current player before it can resolve either direction', () => {
    expect(hasEnoughScannedContext([11544, 11515], 999, 'next')).toBe(false);
    expect(hasEnoughScannedContext([11544, 11515], 999, 'previous')).toBe(false);
  });

  it('resolves previous as soon as the current player is seen', () => {
    expect(hasEnoughScannedContext([11544, 11515], 11515, 'previous')).toBe(true);
  });

  it('waits for one more entry before resolving next', () => {
    expect(hasEnoughScannedContext([11544, 11515], 11515, 'next')).toBe(false);
    expect(hasEnoughScannedContext([11544, 11515, 11504], 11515, 'next')).toBe(true);
  });
});
