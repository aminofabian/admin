import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../client', () => ({
  isJevConfigured: vi.fn(),
  toolGuard: vi.fn(),
}));

import { isJevConfigured, toolGuard } from '../client';
import { guardTransactionAction } from '../transaction-action-guard';

describe('guardTransactionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips when Jev is not configured', async () => {
    vi.mocked(isJevConfigured).mockReturnValue(false);
    const outcome = await guardTransactionAction({
      txnId: '1',
      type: 'complete',
      alreadyConfirmed: false,
    });
    expect(outcome).toEqual({ kind: 'skip', reason: 'not_configured' });
    expect(toolGuard).not.toHaveBeenCalled();
  });

  it('denies when Jev decision is deny', async () => {
    vi.mocked(isJevConfigured).mockReturnValue(true);
    vi.mocked(toolGuard).mockResolvedValue({
      decision: 'deny',
      guidance: 'Do not proceed',
      confidence: 0.9,
    });
    const outcome = await guardTransactionAction({
      txnId: '42',
      type: 'send_to_binpay',
      alreadyConfirmed: false,
    });
    expect(outcome.kind).toBe('deny');
    if (outcome.kind === 'deny') {
      expect(outcome.result.guidance).toBe('Do not proceed');
    }
  });

  it('requires confirmation for confirm when not yet confirmed', async () => {
    vi.mocked(isJevConfigured).mockReturnValue(true);
    vi.mocked(toolGuard).mockResolvedValue({
      decision: 'confirm',
      guidance: 'Ask the operator',
    });
    const outcome = await guardTransactionAction({
      txnId: '7',
      type: 'complete',
      alreadyConfirmed: false,
    });
    expect(outcome.kind).toBe('needs_confirmation');
  });

  it('allows confirm after operator confirmation', async () => {
    vi.mocked(isJevConfigured).mockReturnValue(true);
    vi.mocked(toolGuard).mockResolvedValue({
      decision: 'confirm',
      guidance: 'Ask the operator',
    });
    const outcome = await guardTransactionAction({
      txnId: '7',
      type: 'complete',
      alreadyConfirmed: true,
    });
    expect(outcome.kind).toBe('allow');
  });
});
