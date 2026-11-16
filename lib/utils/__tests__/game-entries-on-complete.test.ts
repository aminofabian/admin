import {
  normalizeGameIdentifier,
  requiresEntriesOnComplete,
  requiresEntriesOnCompleteFromQueue,
  isSweepstakesStyleGameFromQueue,
  isRiversweepGameFromQueue,
  collectQueueGameHintStrings,
} from '../game-entries-on-complete';

describe('normalizeGameIdentifier', () => {
  it('lowercases and strips spaces, underscores, and hyphens', () => {
    expect(normalizeGameIdentifier('Golden Dragon')).toBe('goldendragon');
    expect(normalizeGameIdentifier('RIVER_SWEEP')).toBe('riversweep');
    expect(normalizeGameIdentifier('river-pay')).toBe('riverpay');
    expect(normalizeGameIdentifier('Riversweeps')).toBe('riversweeps');
  });
});

describe('requiresEntriesOnComplete', () => {
  it('does not match Riversweeps or RiverPay title and code variants', () => {
    expect(requiresEntriesOnComplete({ gameTitle: 'River Sweeps' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameTitle: 'Riversweep' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameTitle: 'Riversweeps' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameCode: 'RIVERSWEEPS' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameCode: 'RS' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameCode: 'river_pay' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameTitle: 'RiverPay' })).toBe(false);
  });

  it('matches Golden Dragon title and code variants', () => {
    expect(requiresEntriesOnComplete({ gameTitle: 'Golden Dragon' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameCode: 'GOLDEN_DRAGON' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameCode: 'goldendragon' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameCode: 'GD' })).toBe(true);
  });

  it('matches via game_category when queue fields are abbreviated', () => {
    expect(requiresEntriesOnComplete({ gameCode: 'GD', gameCategory: 'Golden Dragon' })).toBe(
      true,
    );
    expect(requiresEntriesOnComplete({ gameCode: 'RS', gameCategory: 'Riversweep' })).toBe(false);
  });

  it('ignores Riversweeps hints nested in queue data and remarks', () => {
    expect(
      requiresEntriesOnComplete({
        dataStrings: collectQueueGameHintStrings({
          integration: 'RiverPay',
          game_code: 'RS',
        }),
      }),
    ).toBe(false);
    expect(requiresEntriesOnComplete({ remarks: 'Manual Riversweeps recharge queued' })).toBe(
      false,
    );
    expect(requiresEntriesOnComplete({ remarks: 'Manual Golden Dragon recharge queued' })).toBe(
      true,
    );
  });

  it('does not match unrelated games', () => {
    expect(requiresEntriesOnComplete({ gameTitle: 'Ultra Panda' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameCode: 'ULTRAPANDA' })).toBe(false);
    expect(requiresEntriesOnComplete({ gameTitle: 'Juwa' })).toBe(false);
  });
});

describe('requiresEntriesOnCompleteFromQueue', () => {
  it('reads requires_new_entries from queue data', () => {
    expect(
      requiresEntriesOnCompleteFromQueue({
        game: '',
        game_code: '',
        remarks: '',
        data: { requires_new_entries: true },
      }),
    ).toBe(true);
  });
});

describe('isSweepstakesStyleGameFromQueue', () => {
  it('matches Golden Dragon as a sweepstakes-style game', () => {
    expect(
      isSweepstakesStyleGameFromQueue({
        game: 'Golden Dragon',
        game_code: '',
        remarks: '',
        data: null,
      }),
    ).toBe(true);
  });

  it('does not match Riversweeps as a sweepstakes-style game', () => {
    expect(
      isSweepstakesStyleGameFromQueue({
        game: 'Riversweeps',
        game_code: '',
        remarks: '',
        data: null,
      }),
    ).toBe(false);
  });
});

describe('isRiversweepGameFromQueue', () => {
  it('matches Riversweep title variants', () => {
    expect(
      isRiversweepGameFromQueue({
        game: 'Riversweeps',
        game_code: '',
        remarks: '',
        data: null,
      }),
    ).toBe(true);
    expect(
      isRiversweepGameFromQueue({
        game: 'River Sweeps',
        game_code: '',
        remarks: '',
        data: null,
      }),
    ).toBe(true);
  });

  it('does not match Golden Dragon or RiverPay', () => {
    expect(
      isRiversweepGameFromQueue({
        game: 'Golden Dragon',
        game_code: '',
        remarks: '',
        data: null,
      }),
    ).toBe(false);
    expect(
      isRiversweepGameFromQueue({
        game: 'RiverPay',
        game_code: '',
        remarks: '',
        data: null,
      }),
    ).toBe(false);
  });
});
