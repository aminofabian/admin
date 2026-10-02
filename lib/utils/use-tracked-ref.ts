'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

export interface TrackedRef<T> {
  /**
   * Read the current value. Safe in effects, callbacks and memos.
   *
   * A live getter rather than a snapshot: the hook body runs once while the
   * underlying ref keeps changing.
   */
  readonly current: T;
  /**
   * Write the value and bump `version`.
   *
   * The write itself is not reactive — the ref does not trigger a render — so
   * `version` exists purely so a `useMemo` that reads `current` can depend on
   * this object and be re-evaluated when the value actually changed.
   */
  set: (value: T) => void;
  /** Changes only when the value changes. Safe to list as a dependency. */
  version: number;
}

/**
 * A ref that can be depended upon.
 *
 * Two `useMemo`s in the chat list read a ref that plain `useRef` wrote from
 * inside effects. Refs are invisible to React's dependency tracking, so those
 * memos only recomputed when one of their *other* dependencies happened to
 * change — meaning a deep-linked player could appear or vanish depending on
 * incidental WebSocket traffic, and React was free to discard the memo cache at
 * any time. Converting the ref to state would have fixed correctness but made
 * every read a render dependency, so the non-reactive behaviour is kept and a
 * version counter is exposed instead.
 */
export function useTrackedRef<T>(initialValue: T): TrackedRef<T> {
  const ref = useRef<T>(initialValue);
  const [version, setVersion] = useState(0);

  const set = useCallback((value: T) => {
    if (Object.is(ref.current, value)) return;
    ref.current = value;
    setVersion((current) => current + 1);
  }, []);

  // The returned object is stable across renders and changes identity only when
  // `version` does. That lets callers list it directly in a dependency array:
  // a fresh object every render would defeat the very memo this exists to fix.
  return useMemo<TrackedRef<T>>(
    () => ({
      get current() {
        return ref.current;
      },
      set,
      version,
    }),
    [set, version],
  );
}
