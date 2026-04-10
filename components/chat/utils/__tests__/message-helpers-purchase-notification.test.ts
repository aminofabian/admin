import { describe, expect, it } from 'vitest';
import { isPurchaseNotification, parseTransactionMessage } from '../message-helpers';

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
