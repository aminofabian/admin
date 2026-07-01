import {
  normalizeGameIdentifier,
  requiresEntriesOnComplete,
} from '../game-entries-on-complete';

describe('normalizeGameIdentifier', () => {
  it('lowercases and strips spaces, underscores, and hyphens', () => {
    expect(normalizeGameIdentifier('Golden Dragon')).toBe('goldendragon');
    expect(normalizeGameIdentifier('RIVER_SWEEP')).toBe('riversweep');
    expect(normalizeGameIdentifier('river-pay')).toBe('riverpay');
  });
});

describe('requiresEntriesOnComplete', () => {
  it('matches River Sweeps title and code variants', () => {
    expect(requiresEntriesOnComplete({ gameTitle: 'River Sweeps' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameTitle: 'Riversweep' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameCode: 'RIVERSWEEPS' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameCode: 'river_pay' })).toBe(true);
  });

  it('matches Golden Dragon title and code variants', () => {
    expect(requiresEntriesOnComplete({ gameTitle: 'Golden Dragon' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameCode: 'GOLDEN_DRAGON' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameCode: 'goldendragon' })).toBe(true);
  });

  it('matches via game_category when queue fields are abbreviated', () => {
    expect(requiresEntriesOnComplete({ gameCode: 'GD', gameCategory: 'Golden Dragon' })).toBe(
      true,
    );
    expect(requiresEntriesOnComplete({ gameCode: 'RS', gameCategory: 'Riversweep' })).toBe(true);
  });

  it('does not match unrelated games', () => {
    expect(requiresEntriesOnComplete({ gameTitle: 'Ultra Panda' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameCode: 'ULTRAPANDA' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameTitle: 'Juwa' })).toBe(false);
  });
});
