import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounceByKey } from '../debounce-by-key';

describe('debounceByKey', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces rapid calls for the SAME key', () => {
    const fn = vi.fn();
    const debounced = debounceByKey(fn, 100);

    debounced('a', 1);
    debounced('a', 2);
    debounced('a', 3);
    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a', 3);
  });

  it('does NOT drop a different key within the window', () => {
    // This is the bug: a single shared timer meant player B's message
    // cancelled player A's pending update.
    const fn = vi.fn();
    const debounced = debounceByKey(fn, 100);

    debounced('a', 'message-for-a');
    vi.advanceTimersByTime(20);
    debounced('b', 'message-for-b');
    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith('a', 'message-for-a');
    expect(fn).toHaveBeenCalledWith('b', 'message-for-b');
  });

  it('keeps many independent keys in flight', () => {
    const fn = vi.fn();
    const debounced = debounceByKey(fn, 100);

    for (const key of ['a', 'b', 'c', 'd', 'e']) debounced(key, key);
    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('passes the key through to the callback', () => {
    const fn = vi.fn();
    const debounced = debounceByKey(fn, 10);
    debounced('chat-42', { unread: 1 });
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledWith('chat-42', { unread: 1 });
  });

  it('cancel() drops every pending timer', () => {
    const fn = vi.fn();
    const debounced = debounceByKey(fn, 100);

    debounced('a');
    debounced('b');
    debounced.cancel();
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();
  });

  it('cancelKey() drops only that key', () => {
    const fn = vi.fn();
    const debounced = debounceByKey(fn, 100);

    debounced('a', 1);
    debounced('b', 2);
    debounced.cancelKey('a');
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b', 2);
  });

  it('a cancelled key can be scheduled again', () => {
    const fn = vi.fn();
    const debounced = debounceByKey(fn, 100);

    debounced('a', 1);
    debounced.cancelKey('a');
    debounced('a', 2);
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a', 2);
  });

  it('removes the timer entry after firing so memory does not grow', () => {
    const fn = vi.fn();
    const debounced = debounceByKey(fn, 50);
    debounced('a');
    debounced('b');
    vi.advanceTimersByTime(100);
    // Re-running cancel after everything fired must be a no-op, and a fresh
    // schedule must still work.
    debounced.cancel();
    debounced('c', 3);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
