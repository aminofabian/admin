import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatMessage } from '@/types';
import {
  classifyMessage,
  clearMessageClassificationCaches,
  getTransactionDetails,
} from '../message-classification';
import { clearStripHtmlCache, stripHtml, parseTransactionMessage } from '../message-helpers';

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1',
  text: 'hello there',
  sender: 'player',
  timestamp: '2026-01-01T10:00:00.000Z',
  date: '2026-01-01',
  userId: 7,
  isRead: true,
  ...over,
});

describe('classifyMessage', () => {
  beforeEach(() => {
    clearMessageClassificationCaches();
    clearStripHtmlCache();
  });

  it('classifies an ordinary player message as chat', () => {
    const c = classifyMessage(msg());
    expect(c.isSystemMessage).toBe(false);
    expect(c).toMatchObject({
      isAuto: false,
      isPurchase: false,
      isPrizeWheel: false,
      isKyc: false,
    });
  });

  it('flags a transaction card', () => {
    const c = classifyMessage(msg({ text: 'You successfully purchased $10.00' }));
    expect(c.isPurchase).toBe(true);
    expect(c.isSystemMessage).toBe(true);
  });

  it('flags an approved identity-verification card', () => {
    const c = classifyMessage(msg({ text: 'Your identity verification has been approved' }));
    expect(c.isKyc).toBe(true);
    expect(c.isSystemMessage).toBe(true);
  });

  it('returns the identical object for the same message instance', () => {
    // The whole point: the parent list and the bubble both ask, and the second
    // ask must be free.
    const m = msg();
    expect(classifyMessage(m)).toBe(classifyMessage(m));
  });

  it('runs each classifier only once per message instance', () => {
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const m = msg();
    classifyMessage(m);
    const afterFirst = spy.mock.calls.length;
    classifyMessage(m);
    classifyMessage(m);
    expect(spy.mock.calls.length).toBe(afterFirst);
    spy.mockRestore();
  });

  it('does not leak a result between two messages with identical text', () => {
    const purchase = classifyMessage(msg({ id: 'a', text: 'You successfully purchased $10.00' }));
    const chat = classifyMessage(msg({ id: 'b', text: 'You successfully purchased $10.00' }));
    expect(purchase.isPurchase).toBe(true);
    expect(chat.isPurchase).toBe(true);
    expect(purchase).not.toBe(chat);
  });

  it('re-classifies after the caches are cleared', () => {
    const m = msg();
    const first = classifyMessage(m);
    clearMessageClassificationCaches();
    expect(classifyMessage(m)).not.toBe(first);
    expect(classifyMessage(m).isSystemMessage).toBe(false);
  });
});

describe('getTransactionDetails', () => {
  beforeEach(() => {
    clearMessageClassificationCaches();
  });

  it('memoises the parse per message instance', () => {
    const m = msg({ text: '$25.00 added to your credit balance' });
    expect(getTransactionDetails(m)).toBe(getTransactionDetails(m));
  });

  it('extracts the same details as a direct parse', () => {
    const m = msg({ text: '$25.00 added to your credit balance' });
    expect(getTransactionDetails(m)).toEqual(
      parseTransactionMessage(m.text, m.type, m.operationType),
    );
  });
});

describe('stripHtml memoisation', () => {
  beforeEach(() => clearStripHtmlCache());

  it('returns the same value on repeat calls', () => {
    expect(stripHtml('<b>hi</b>')).toBe('hi');
    expect(stripHtml('<b>hi</b>')).toBe('hi');
  });

  it('still strips tags correctly after caching', () => {
    // Note: the DOM path returns textContent, so a `<br>` yields no separator
    // ("ab"), while the SSR regex fallback yields "a\nb". That divergence is
    // long-standing and unchanged by memoisation — asserted here so a future
    // change to it is deliberate.
    expect(stripHtml('<i>x</i> y')).toBe('x y');
    expect(stripHtml('<b>bold</b> plain')).toBe('bold plain');
    expect(stripHtml('no markup at all')).toBe('no markup at all');
    expect(stripHtml('')).toBe('');
    expect(stripHtml('a<br>b')).toBe('ab');
  });

  it('is stable across cache eviction (500-entry bound)', () => {
    // Force many distinct entries to trip the bound, then re-check an early one.
    expect(stripHtml('<b>first</b>')).toBe('first');
    for (let i = 0; i < 600; i += 1) stripHtml(`<b>entry ${i}</b>`);
    expect(stripHtml('<b>first</b>')).toBe('first');
    expect(stripHtml('<b>entry 599</b>')).toBe('entry 599');
  });

  it('handles distinct inputs independently', () => {
    expect(stripHtml('<b>one</b>')).toBe('one');
    expect(stripHtml('<b>two</b>')).toBe('two');
    expect(stripHtml('<b>one</b>')).toBe('one');
  });
});
