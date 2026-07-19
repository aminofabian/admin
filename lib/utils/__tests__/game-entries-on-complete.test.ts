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
  it('matches River Sweeps title and code variants', () => {
    expect(requiresEntriesOnComplete({ gameTitle: 'River Sweeps' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameTitle: 'Riversweep' })).toBe(true);
    expect(requiresEntriesOnComplete({ gameTitle: 'Riversweeps' })).toBe(true);
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

  it('matches hints nested in queue data and remarks', () => {
    expect(
      requiresEntriesOnComplete({
        dataStrings: collectQueueGameHintStrings({
          integration: 'RiverPay',
          game_code: 'RS',
        }),
      }),
    ).toBe(true);
    expect(requiresEntriesOnComplete({ remarks: 'Manual Riversweeps recharge queued' })).toBe(
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

  it('matches Riversweeps as a sweepstakes-style game', () => {
    expect(
      isSweepstakesStyleGameFromQueue({
        game: 'Riversweeps',
        game_code: '',
        remarks: '',
        data: null,
      }),
    ).toBe(true);
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
