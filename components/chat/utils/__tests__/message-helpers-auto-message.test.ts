import { describe, it, expect } from 'vitest';
import { isAutoMessage, isPurchaseNotification } from '../message-helpers';

/**
 * The player list renders previews from a bare `{ text }` object — no `userId`,
 * no `type`, no `sender`. `isAutoMessage` used to treat `userId === undefined`
 * as proof that a message was system-generated, so every customer last-message
 * was rendered as a system transaction card.
 */
const sidebarPreview = (text: string) => ({ text });

describe('isAutoMessage — missing fields are not evidence of automation', () => {
  it('does not classify an ordinary customer message as automated', () => {
    for (const text of [
      'where is my bonus?',
      'hello are you there',
      'I deposited yesterday and nothing arrived',
      'can you check my balance please',
      'thanks!',
    ]) {
      expect(isAutoMessage(sidebarPreview(text))).toBe(false);
    }
  });

  it('still classifies genuine system copy as automated', () => {
    for (const text of [
      'Recharge',
      'Successfully recharged $20.00',
      'System: maintenance window at 02:00 UTC',
      'Auto: bonus applied',
    ]) {
      expect(isAutoMessage(sidebarPreview(text))).toBe(true);
    }
  });

  it('leaves purchase notifications to their own handler', () => {
    // These are rendered as transaction cards via isPurchaseNotification, which
    // is checked first and deliberately wins over isAutoMessage.
    for (const text of ['$5.00 added to your credit balance', 'Added to your credit balance']) {
      expect(isPurchaseNotification({ text })).toBe(true);
      expect(isAutoMessage({ text })).toBe(false);
    }
  });

  it('does not treat a missing userId as a system marker', () => {
    expect(isAutoMessage({ text: 'random chatter' })).toBe(false);
  });

  it('still honours an explicit userId of 0 as a system marker', () => {
    expect(isAutoMessage({ text: 'unrecognised system copy', userId: 0 })).toBe(true);
  });

  it('respects an explicit type even when userId is absent', () => {
    expect(isAutoMessage({ text: 'anything', type: 'system' })).toBe(true);
    expect(isAutoMessage({ text: 'anything', type: 'notification' })).toBe(true);
  });

  it('does not treat a plain balanceUpdated message as automated', () => {
    expect(isAutoMessage({ text: 'Balance: $10', type: 'balanceUpdated' })).toBe(false);
  });

  it('does classify a manual balance operation as automated', () => {
    // Without a leading amount this is not a purchase notification, so the
    // manual-operation copy in the balanceUpdated branch applies.
    expect(
      isAutoMessage({ text: 'Manual top-up of $25 applied', type: 'balanceUpdated' }),
    ).toBe(true);
  });

  it('handles empty text safely', () => {
    expect(isAutoMessage({ text: '' })).toBe(false);
  });
});
