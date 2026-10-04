import { describe, expect, it } from 'vitest';
import {
  chronologicalFromApiPage,
  looksLikeOldestFirstPagination,
  mergeMessageLists,
} from '../message-history-order';

describe('chronologicalFromApiPage', () => {
  it('reverses newest-first API pages into oldest→newest for the UI', () => {
    const apiPage = [
      { id: '3', timestamp: '2026-03-25T17:00:00.000Z' },
      { id: '2', timestamp: '2026-03-25T16:00:00.000Z' },
      { id: '1', timestamp: '2026-02-13T11:00:00.000Z' },
    ];
    expect(chronologicalFromApiPage(apiPage).map((m) => m.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });
});

describe('mergeMessageLists', () => {
  it('replace mode keeps only the incoming page, sorted ascending', () => {
    const existing = [
      { id: 'old', timestamp: '2026-01-01T00:00:00.000Z' },
    ];
    const incoming = [
      { id: 'b', timestamp: '2026-03-25T16:00:00.000Z' },
      { id: 'a', timestamp: '2026-03-25T15:00:00.000Z' },
    ];
    expect(
      mergeMessageLists(incoming, existing, 'replace').map((m) => m.id),
    ).toEqual(['a', 'b']);
  });

  it('prepend mode attaches older pages above the current window', () => {
    const existing = [
      { id: '2', timestamp: '2026-03-25T16:00:00.000Z' },
      { id: '3', timestamp: '2026-03-25T17:00:00.000Z' },
    ];
    const older = [
      { id: '0', timestamp: '2026-02-01T00:00:00.000Z' },
      { id: '1', timestamp: '2026-02-13T11:00:00.000Z' },
    ];
    expect(
      mergeMessageLists(older, existing, 'prepend').map((m) => m.id),
    ).toEqual(['0', '1', '2', '3']);
  });
});

describe('looksLikeOldestFirstPagination', () => {
  it('flags when page 1 is older than page 2 (backend inverted)', () => {
    const page1 = [
      { id: '1', timestamp: '2025-01-01T00:00:00.000Z' },
      { id: '2', timestamp: '2025-01-02T00:00:00.000Z' },
    ];
    const page2 = [
      { id: '3', timestamp: '2026-03-01T00:00:00.000Z' },
      { id: '4', timestamp: '2026-03-25T00:00:00.000Z' },
    ];
    expect(looksLikeOldestFirstPagination(page1, page2)).toBe(true);
  });

  it('is false when page 1 is the newest window', () => {
    const page1 = [
      { id: '3', timestamp: '2026-03-24T00:00:00.000Z' },
      { id: '4', timestamp: '2026-03-25T00:00:00.000Z' },
    ];
    const page2 = [
      { id: '1', timestamp: '2025-01-01T00:00:00.000Z' },
      { id: '2', timestamp: '2025-01-02T00:00:00.000Z' },
    ];
    expect(looksLikeOldestFirstPagination(page1, page2)).toBe(false);
  });
});
