import { describe, expect, it } from 'vitest';
import { normalizeHistoryEntry, normalizeHistoryList } from '../normalize';

const cycle = {
  id: 12,
  draw_type: 'weekly',
  draw_method: 'manual',
  completed_at: '2026-10-24T12:00:00.000Z',
  ticket_count: 500,
  player_count: 50,
  winners: [
    {
      id: 9,
      position: 1,
      player_username: 'lucky_player',
      prize_amount: '50.00',
      prize_status: 'pending',
    },
  ],
};

describe('normalizeHistoryList', () => {
  it('reads a bare list', () => {
    const rows = normalizeHistoryList([cycle]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.draw_method).toBe('manual');
    expect(rows[0]?.winners[0]?.player_username).toBe('lucky_player');
  });

  it('reads a paginated results object', () => {
    const rows = normalizeHistoryList({ count: 1, results: [cycle] });
    expect(rows[0]?.id).toBe(12);
    expect(rows[0]?.winners[0]?.prize_status).toBe('pending');
  });

  it('returns an empty list for a non-list payload', () => {
    expect(normalizeHistoryList({ count: 0 })).toEqual([]);
    expect(normalizeHistoryList(null)).toEqual([]);
  });
});

describe('normalizeHistoryEntry', () => {
  it('treats credited:false as a pending prize', () => {
    const entry = normalizeHistoryEntry({
      id: 102,
      draw_type: 'monthly',
      method: 'manual',
      completed_at: '2026-10-29T07:49:31.897Z',
      scheduled_at: '2026-11-14T07:33:35.467Z',
      winners: [
        {
          position: 1,
          player_username: 'winner_1',
          prize_amount: '500.00',
          credited: false,
        },
      ],
    });
    expect(entry?.draw_method).toBe('manual');
    expect(entry?.scheduled_draw_at).toBe('2026-11-14T07:33:35.467Z');
    expect(entry?.winners[0]?.prize_status).toBe('pending');
  });

  it('reads a detail payload with a nested cycle', () => {
    const entry = normalizeHistoryEntry({
      cycle,
      winners: cycle.winners,
    });
    expect(entry?.id).toBe(12);
    expect(entry?.winners).toHaveLength(1);
  });
});
