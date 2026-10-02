import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatMessage } from '@/types';
import { classifyMessage, clearMessageClassificationCaches } from '../message-classification';
import { clearStripHtmlCache, stripHtml } from '../message-helpers';

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm', text: 'hello', sender: 'player',
  timestamp: '2026-01-01T10:00:00.000Z', date: '2026-01-01',
  userId: 1, isRead: true, ...over,
});

/**
 * Guards the optimisation that motivated this work: ~19 HTML parses per row per
 * render used to make scrolling the transcript O(n) parses per frame.
 *
 * This asserts on call counts rather than wall-clock, so it is deterministic
 * and cannot pass by accident on a fast machine.
 */
describe('render-path work', () => {
  beforeEach(() => {
    clearMessageClassificationCaches();
    clearStripHtmlCache();
  });

  it('parses a repeated message body once, not once per call', () => {
    const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const body = '<b>Recharge</b><br>Balance: $10.00';
    const m = msg({ text: body });

    // One full classification (4 classifiers, each stripping the same body).
    classifyMessage(m);
    const afterFirst = parseSpy.mock.calls.length;
    expect(afterFirst).toBeGreaterThan(0);

    // The bubble asks again, and the list asks about the previous message too.
    classifyMessage(m);
    classifyMessage(m);
    expect(parseSpy.mock.calls.length).toBe(afterFirst);

    parseSpy.mockRestore();
  });

  it('keeps total parses constant as the transcript grows', () => {
    const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const messages = Array.from({ length: 200 }, (_, i) =>
      msg({ id: `m${i}`, text: `message body number ${i}` }),
    );

    // First pass: every message is new, so each is parsed once.
    const firstPass = (() => {
      const before = parseSpy.mock.calls.length;
      for (const m of messages) classifyMessage(m);
      return parseSpy.mock.calls.length - before;
    })();
    expect(firstPass).toBe(messages.length);

    // Second pass — a re-render, or the bubble re-classifying its own message,
    // plus each row checking the message before it. All cache hits.
    const secondPass = (() => {
      const before = parseSpy.mock.calls.length;
      for (const m of messages) classifyMessage(m);
      for (let i = 1; i < messages.length; i += 1) classifyMessage(messages[i - 1]);
      return parseSpy.mock.calls.length - before;
    })();
    expect(secondPass).toBe(0);

    parseSpy.mockRestore();
  });

  it('stripHtml serves repeats from cache', () => {
    const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const body = '<i>cached</i> text';
    stripHtml(body);
    const after = parseSpy.mock.calls.length;
    for (let i = 0; i < 50; i += 1) stripHtml(body);
    expect(parseSpy.mock.calls.length).toBe(after);
    parseSpy.mockRestore();
  });
});
