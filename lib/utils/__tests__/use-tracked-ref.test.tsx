import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useTrackedRef } from '../use-tracked-ref';

describe('useTrackedRef', () => {
  it('reads back what was written', () => {
    const { result } = renderHook(() => useTrackedRef<{ id: number } | null>(null));
    expect(result.current.current).toBeNull();

    act(() => result.current.set({ id: 7 }));
    expect(result.current.current).toEqual({ id: 7 });
  });

  it('bumps its identity only when the value actually changes', () => {
    const { result } = renderHook(() => useTrackedRef<string>('a'));
    const first = result.current;

    // Same value: no bump, so a dependent memo is not invalidated needlessly.
    act(() => result.current.set('a'));
    expect(result.current).toBe(first);

    act(() => result.current.set('b'));
    expect(result.current).not.toBe(first);
    expect(result.current.version).toBeGreaterThan(first.version);
  });

  it('stays stable across renders that do not write', () => {
    const { result, rerender } = renderHook(() => useTrackedRef<number>(1));
    const first = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(first);
  });

  it('can be listed as a memo dependency without defeating the memo', () => {
    // The bug this exists to fix: a plain ref fed a useMemo, so the memo only
    // recomputed when an unrelated dependency changed.
    const { result } = renderHook(() => {
      const tracked = useTrackedRef<number>(0);
      const memo = React.useMemo(
        () => ({ doubled: tracked.current * 2 }),
        [tracked],
      );
      return { tracked, memo };
    });

    expect(result.current.memo.doubled).toBe(0);

    act(() => result.current.tracked.set(21));
    expect(result.current.memo.doubled).toBe(42);
  });

  it('handles object identity comparison', () => {
    const { result } = renderHook(() => useTrackedRef<object | null>(null));
    const a = { x: 1 };
    act(() => result.current.set(a));
    act(() => result.current.set(a));
    // Same reference: still no bump.
    expect(result.current.version).toBe(1);
    act(() => result.current.set({ x: 1 }));
    expect(result.current.version).toBe(2);
  });
});
