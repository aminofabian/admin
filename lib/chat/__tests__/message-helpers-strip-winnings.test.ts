import { describe, expect, it } from 'vitest';
import {
  prepareChatMessageHtmlForDisplay,
  formatTransactionMessage,
} from '@/components/chat/utils/message-helpers';

describe('prepareChatMessageHtmlForDisplay', () => {
  it('removes Winnings and relabels Credits to Balance', () => {
    const html =
      '<b>$100.0</b> purchased via <b>Card</b>.<br>Credits: <b>$300.0000</b><br>Winnings: <b>$0.0000</b>';
    const out = prepareChatMessageHtmlForDisplay(html);
    expect(out).not.toMatch(/Winnings/i);
    expect(out).not.toMatch(/Credits/i);
    expect(out).toMatch(/Balance/);
  });

  it('formatTransactionMessage output has no Winnings or Credits label', () => {
    const html =
      '<b>$50</b> purchased.<br>Credits: <b>$110</b><br>Winnings: <b>$0</b>';
    const out = formatTransactionMessage({ text: html });
    expect(out).not.toMatch(/Winnings/i);
    expect(out).not.toMatch(/Credits/i);
    expect(out).toMatch(/Balance/);
  });
});
