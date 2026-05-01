import { describe, expect, it } from 'vitest';
import { isAutoMessage, isPurchaseNotification, parseTransactionMessage } from '../message-helpers';

describe('isPurchaseNotification', () => {
  it('should not treat colloquial player text about cashing out as a purchase notification', () => {
    expect(
      isPurchaseNotification({
        text: 'Someone cashed out my winnings? I don\'t have litecoins',
        type: 'message',
        sender: 'player',
      }),
    ).toBe(false);
  });

  it('should treat successful cashout system copy as a purchase notification', () => {
    expect(
      isPurchaseNotification({
        text: 'You successfully cashed out $25.00 to your wallet.',
        type: 'message',
        sender: 'player',
      }),
    ).toBe(true);
  });

  it('should not treat signup bonus welcome copy as a purchase/transaction card', () => {
    const msg = {
      text: 'Added 20 signup bonus for u',
      type: 'purchase_notification' as const,
      userId: 0,
    };
    expect(isPurchaseNotification(msg)).toBe(false);
    expect(isAutoMessage(msg)).toBe(false);
  });

  it('should treat ledger-style signup bonus (amount + balance) as a transaction card', () => {
    const msg = {
      text: '$2.00 added as Sign Up Bonus.<br />Balance: $2.00',
      type: 'message' as const,
      sender: 'player' as const,
    };
    expect(isPurchaseNotification(msg)).toBe(true);
    expect(isAutoMessage(msg)).toBe(false);
  });
});

describe('parseTransactionMessage', () => {
  it('should classify cashout only when copy matches successful cashout', () => {
    const informal = parseTransactionMessage(
      'Someone cashed out my winnings?',
      'message',
      null,
    );
    expect(informal.type).not.toBe('cashout');

    const system = parseTransactionMessage(
      'You successfully cashed out $10.',
      'message',
      null,
    );
    expect(system.type).toBe('cashout');
  });
});
