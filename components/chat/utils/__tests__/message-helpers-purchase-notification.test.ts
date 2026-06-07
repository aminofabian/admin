import { describe, expect, it } from 'vitest';
import {
  getTransactionCardClass,
  getTransactionTextColorClass,
  isAutoMessage,
  isPurchaseNotification,
  isPrizeWheelMessage,
  parseTransactionMessage,
  transactionTypeToVisualKind,
} from '../message-helpers';

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

  it('should treat ledger-style cashout via payment method as a purchase notification', () => {
    expect(
      isPurchaseNotification({
        text: '<b>$3.00</b> cashed out via <b>Bitcoin Lightning.</b><br />Balance: <b>$704.29</b>',
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

describe('isPrizeWheelMessage', () => {
  it('should treat daily bonus spin credits as a centered transaction card', () => {
    const msg = {
      text: '3 spins added as daily bonus.',
      type: 'message' as const,
      sender: 'admin' as const,
    };
    expect(isPrizeWheelMessage(msg)).toBe(true);
    expect(isPurchaseNotification(msg)).toBe(false);
    expect(isAutoMessage(msg)).toBe(false);
  });

  it('should treat prize wheel wins as a centered transaction card', () => {
    const msg = {
      text: '<b>$1.00</b> won from prize wheel. Balance: <b>$82.00</b> Prize: <b>$1.00</b>',
      type: 'message' as const,
      sender: 'admin' as const,
    };
    expect(isPrizeWheelMessage(msg)).toBe(true);
    expect(parseTransactionMessage(msg.text).type).toBe('prize_wheel');
  });

  it('should treat respin wins as a centered transaction card', () => {
    const msg = {
      text: '1 spin won from prize wheel. Prize: 1 Respin',
      type: 'message' as const,
      sender: 'admin' as const,
    };
    expect(isPrizeWheelMessage(msg)).toBe(true);
    expect(parseTransactionMessage(msg.text).type).toBe('prize_wheel');
  });

  it('matches roulette wording from alternate backend copy', () => {
    expect(
      isPrizeWheelMessage({
        text: '$2.00 won from roulette. Balance: $84.00 Prize: $2.00',
        type: 'message',
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

    const viaMethod = parseTransactionMessage(
      '<b>$3.00</b> cashed out via <b>Bitcoin Lightning.</b><br />Balance: <b>$704.29</b>',
      'message',
      null,
    );
    expect(viaMethod.type).toBe('cashout');
    expect(viaMethod.paymentMethod).toBe('Bitcoin Lightning');
  });
});

describe('transaction visual colors', () => {
  it('maps transaction types to purchase / withdraw / recharge / redeem colors', () => {
    expect(transactionTypeToVisualKind('credit_purchase')).toBe('purchase');
    expect(transactionTypeToVisualKind('cashout')).toBe('withdraw');
    expect(transactionTypeToVisualKind('recharge')).toBe('recharge');
    expect(transactionTypeToVisualKind('redeem')).toBe('redeem');
    expect(getTransactionTextColorClass('purchase')).toContain('green');
    expect(getTransactionTextColorClass('withdraw')).toContain('red');
    expect(getTransactionTextColorClass('recharge')).toContain('purple');
    expect(getTransactionTextColorClass('redeem')).toContain('orange');
    expect(getTransactionCardClass('redeem')).toContain('orange');
    expect(transactionTypeToVisualKind('prize_wheel')).toBe('prize_wheel');
    expect(getTransactionTextColorClass('prize_wheel')).toContain('amber');
    expect(getTransactionCardClass('prize_wheel')).toContain('amber');
  });
});
