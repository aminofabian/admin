/**
 * Debounce that keeps one independent timer per key.
 *
 * A plain `debounce` shares a single timer, so calling it for key B within the
 * window of key A cancels A's pending call and only B's arguments survive. In
 * the chat list that meant a message for one player silently discarded the
 * pending update for a different player, leaving a stale last-message until the
 * next poll.
 *
 * With keyed debouncing, rapid updates for the *same* key still coalesce, while
 * every other key is unaffected.
 */
export type KeyedDebounce<A extends unknown[]> = {
  (key: string, ...args: A): void;
  /** Drop every pending timer — call on unmount or disconnect. */
  cancel: () => void;
  /** Drop a single key's pending timer. */
  cancelKey: (key: string) => void;
};

export function debounceByKey<A extends unknown[]>(
  fn: (key: string, ...args: A) => void,
  delay: number,
): KeyedDebounce<A> {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const debounced = ((key: string, ...args: A) => {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);

    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn(key, ...args);
      }, delay),
    );
  }) as KeyedDebounce<A>;

  debounced.cancel = () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  };

  debounced.cancelKey = (key: string) => {
    const timer = timers.get(key);
    if (timer) clearTimeout(timer);
    timers.delete(key);
  };

  return debounced;
}
