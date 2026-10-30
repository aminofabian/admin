import { describe, expect, it } from 'vitest';
import {
  automatedSidebarPreviewHtml,
  getBinpayVerificationKind,
  getTransactionCardClass,
  getTransactionTextColorClass,
  isAutoMessage,
  isKycVerificationMessage,
  isPurchaseNotification,
  isPrizeWheelMessage,
  parseKycMessage,
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

  it('should treat ledger-style referral bonus as a transaction card', () => {
    const msg = {
      text: '<b>test reff2</b> made a first deposit of <b>$300.00</b>. You earned a referral bonus of <b>$100.00</b>. Balance: <b>$113.00</b>',
      type: 'message' as const,
      sender: 'admin' as const,
    };
    expect(isPurchaseNotification(msg)).toBe(true);
    expect(parseTransactionMessage(msg.text).type).toBe('credit_added');
  });

  it('should not treat casual referral chat as a transaction card', () => {
    expect(
      isPurchaseNotification({
        text: 'what is my referral bonus amount?',
        type: 'message',
        sender: 'player',
      }),
    ).toBe(false);
  });
});

/**
 * Copy produced by the chat backend for ledger entries. The exact wording is
 * not stable ("recharged to", "balance transfer completed", "added to your
 * balance"), so these cases pin down the structural shape the classifier uses
 * rather than one phrase per regression.
 */
describe('ledger copy from the chat backend', () => {
  const cases = [
    {
      label: 'recharge with game balance line (plain)',
      text: '$10.00 recharged to Cash Frenzy.<br />New Game Balance: $20.00<br />Balance: $2.00',
      expected: 'recharge',
    },
    {
      label: 'recharge with game balance line (bold amounts)',
      text: '<b>$10.00</b> recharged to <b>Cash Frenzy</b>.<br />New Game Balance: <b>$20.00</b><br />Balance: <b>$2.00</b>',
      expected: 'recharge',
    },
    {
      label: 'balance transfer (plain)',
      text: '$20.00 balance transfer completed.<br />Balance: $62.00',
      expected: 'balance_transfer',
    },
    {
      label: 'balance transfer (bold amounts)',
      text: '<b>$20.00</b> balance transfer completed.<br />Balance: <b>$62.00</b>',
      expected: 'balance_transfer',
    },
    {
      label: 'balance transfer with plain newlines',
      text: '$20.00 balance transfer completed.\nBalance: $62.00',
      expected: 'balance_transfer',
    },
    {
      label: 'amount added to the generic balance',
      text: '$200.00 added to your balance.<br />Balance: $439.00',
      expected: 'credit_added',
    },
    {
      label: 'amount added to the generic balance (bold amounts)',
      text: '<b>$200.00</b> added to your balance.<br />Balance: <b>$439.00</b>',
      expected: 'credit_added',
    },
  ] as const;

  it.each(cases)('renders $label as a transaction card', ({ text, expected }) => {
    const msg = { text, type: 'message', sender: 'admin' as const };
    expect(isPurchaseNotification(msg)).toBe(true);
    // Purchase notifications win over the generic auto handler; the bubble only
    // needs one of the two to be true but they should not both fire.
    expect(isAutoMessage(msg)).toBe(false);
    expect(parseTransactionMessage(text, 'message').type).toBe(expected);
    expect(
      getTransactionCardClass(
        transactionTypeToVisualKind(parseTransactionMessage(text, 'message').type),
      ),
    ).not.toBe('');
  });

  it('does not card player chat that only mentions a transfer or a balance', () => {
    for (const text of [
      'i did a balance transfer yesterday, did it go through?',
      'can you check my balance please',
      'my balance is $0 after that withdrawal lol',
      "Someone cashed out my winnings? I don't have litecoins",
      'why was $20 deducted from my account',
      'is the transfer completed yet?',
    ]) {
      const msg = { text, type: 'message', sender: 'player' as const };
      expect(isPurchaseNotification(msg), text).toBe(false);
      expect(isAutoMessage(msg), text).toBe(false);
    }
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

describe('automatedSidebarPreviewHtml', () => {
  it('colours purchase, cashout, recharge, redeem, and prize-wheel amounts', () => {
    expect(
      automatedSidebarPreviewHtml(
        '<b>$20.00</b> purchased via <b>Crypto</b>.<br>Balance: <b>$29.00</b>',
      ),
    ).toContain('text-green-600');
    expect(
      automatedSidebarPreviewHtml('<b>$3.00</b> cashed out via <b>Bitcoin</b>'),
    ).toContain('text-red-600');
    expect(
      automatedSidebarPreviewHtml('<b>$10.00</b> recharged to <b>Panda Master</b>'),
    ).toContain('text-purple-600');
    expect(
      automatedSidebarPreviewHtml('<b>$15.00</b> redeemed from <b>Cash</b>'),
    ).toContain('text-orange-600');
    expect(
      automatedSidebarPreviewHtml('<b>3 spins</b> added as daily bonus.'),
    ).toContain('text-amber-600');
  });

  it('keeps a coloured amount when the tags were stored escaped', () => {
    const html = automatedSidebarPreviewHtml(
      '&lt;b&gt;3 spins&lt;/b&gt; added as daily bonus.',
    );
    expect(html).toContain('text-amber-600');
    expect(html).toContain('3 spins');
    expect(html).not.toContain('<br');
  });

  it('leaves ordinary chat uncoloured', () => {
    expect(automatedSidebarPreviewHtml('hey can you check this')).toBeNull();
    expect(
      automatedSidebarPreviewHtml("Someone cashed out my winnings? I don't have litecoins"),
    ).toBeNull();
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
    // A balance transfer moves money between the player's own balances, so it
    // uses the neutral manual tint rather than a purchase/cashout colour.
    expect(transactionTypeToVisualKind('balance_transfer')).toBe('manual');
    expect(getTransactionCardClass('manual')).not.toBe('');
  });
});

describe('Binpay verification messages', () => {
  it('shows Identity Verification card only when verification is approved', () => {
    const msg = {
      text: 'Binpay\nYour identity verification has been approved. You can now continue with eligible Binpay purchases.',
      type: 'system' as const,
    };
    expect(isKycVerificationMessage(msg)).toBe(true);
    expect(isAutoMessage(msg)).toBe(false);
    expect(getBinpayVerificationKind(msg)).toBe('approved');
    expect(parseKycMessage(msg).bodyText).toBe(
      'Your identity verification has been approved. You can now continue with eligible purchases.',
    );
  });

  it('does not show Identity Verification card for KYC prompts', () => {
    const msg = {
      text: 'Complete your KYC verification to proceed with cashout. <a href="https://example.com/kyc">Verify</a>',
      type: 'message' as const,
    };
    expect(getBinpayVerificationKind(msg)).toBe('prompt');
    expect(isKycVerificationMessage(msg)).toBe(false);
    expect(parseKycMessage(msg).link).toBe('https://example.com/kyc');
  });

  it('does not show Identity Verification card for rejected verification copy', () => {
    const msg = {
      text: 'Your identity verification was not approved. You can update your profile details and resubmit.',
      type: 'system' as const,
    };
    expect(getBinpayVerificationKind(msg)).toBe('rejected');
    expect(isKycVerificationMessage(msg)).toBe(false);
  });

  it('does not treat casual mentions of identity verification as a verification card', () => {
    const msg = {
      text: 'reload the browser, there you will so complete identity verification option',
      type: 'message' as const,
    };
    expect(isKycVerificationMessage(msg)).toBe(false);
  });

  it('does not treat casual "was approved" chat as an Identity Verification card', () => {
    const msg = {
      text: "wtf thought it was approved now it's rejected??",
      type: 'message' as const,
    };
    expect(getBinpayVerificationKind(msg)).toBe('status');
    expect(isKycVerificationMessage(msg)).toBe(false);
  });

  it('does not show Identity Verification card when casual text is prefixed with the IV title', () => {
    const msg = {
      text: "Identity Verification\nwtf thought it was approved now it's rejected??",
      type: 'system' as const,
    };
    expect(isKycVerificationMessage(msg)).toBe(false);
  });

  it('does not show Identity Verification card for complete-your-KYC cashout prompts', () => {
    const msg = {
      text: 'Complete your KYC to proceed with your Cashout.',
      type: 'message' as const,
    };
    expect(isKycVerificationMessage(msg)).toBe(false);
  });
});
