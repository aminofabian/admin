import { mergeTransactionTextSnapshot } from '../transaction-ws-merge';

describe('mergeTransactionTextSnapshot', () => {
  it('keeps richer existing text when incoming is a strict substring', () => {
    const ex = 'Cashout via Taparcaida | Payment images: https://example.com/a.jpg';
    const inc = 'Cashout via Taparcaida';
    expect(mergeTransactionTextSnapshot(ex, inc)).toBe(ex);
  });

  it('upgrades to incoming when incoming is strictly richer', () => {
    const ex = 'Short';
    const inc = 'Short | extras';
    expect(mergeTransactionTextSnapshot(ex, inc)).toBe(inc);
  });

  it('falls back cleanly when incoming is empty', () => {
    expect(mergeTransactionTextSnapshot('notes', null)).toBe('notes');
    expect(mergeTransactionTextSnapshot('notes', '   ')).toBe('notes');
  });

  it('falls back cleanly when existing is empty', () => {
    expect(mergeTransactionTextSnapshot(undefined, 'new')).toBe('new');
  });

  it('handles unrelated same-length strings by preferring incoming', () => {
    expect(mergeTransactionTextSnapshot('aaaa', 'bbbb')).toBe('bbbb');
  });
});
