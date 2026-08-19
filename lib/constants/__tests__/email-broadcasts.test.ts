import { describe, expect, it } from 'vitest';
import {
  canCancelEmailBroadcast,
  canEditEmailBroadcast,
  canRetryFailedEmailBroadcast,
  canSendEmailBroadcast,
  emailBroadcastFailureNotice,
  formatEmailBroadcastExclusionReason,
} from '../email-broadcasts';

describe('formatEmailBroadcastExclusionReason', () => {
  it('maps known codes to human-readable labels', () => {
    expect(formatEmailBroadcastExclusionReason('email_not_verified')).toBe('Email not verified');
    expect(formatEmailBroadcastExclusionReason('Email not verified')).toBe('Email not verified');
    expect(formatEmailBroadcastExclusionReason('frequency_limit_reached')).toBe(
      'Frequency limit reached',
    );
    expect(formatEmailBroadcastExclusionReason('frequency_limit')).toBe('Frequency limit reached');
    expect(formatEmailBroadcastExclusionReason('unsubscribed')).toBe('Unsubscribed from marketing');
  });

  it('falls back for unknown codes and empty values', () => {
    expect(formatEmailBroadcastExclusionReason(null)).toBe('Excluded');
    expect(formatEmailBroadcastExclusionReason('custom_hold')).toBe('custom hold');
  });
});

describe('campaign actions', () => {
  it('allows edit and send only on drafts', () => {
    expect(canEditEmailBroadcast('draft')).toBe(true);
    expect(canSendEmailBroadcast('draft')).toBe(true);
    expect(canEditEmailBroadcast('queued')).toBe(false);
    expect(canSendEmailBroadcast('sending')).toBe(false);
  });

  it('allows cancel on draft, queued, scheduled, and sending — never paused', () => {
    for (const status of ['draft', 'queued', 'scheduled', 'sending']) {
      expect(canCancelEmailBroadcast(status)).toBe(true);
    }
    expect(canCancelEmailBroadcast('completed')).toBe(false);
    expect(canCancelEmailBroadcast('failed')).toBe(false);
    expect(canCancelEmailBroadcast('cancelled')).toBe(false);
    expect(canCancelEmailBroadcast('paused')).toBe(false);
  });

  it('allows retry failed only when failed_deliveries > 0 on completed, failed, or cancelled', () => {
    expect(canRetryFailedEmailBroadcast('completed', 2)).toBe(true);
    expect(canRetryFailedEmailBroadcast('failed', 1)).toBe(true);
    expect(canRetryFailedEmailBroadcast('cancelled', 4)).toBe(true);
    expect(canRetryFailedEmailBroadcast('completed', 0)).toBe(false);
    expect(canRetryFailedEmailBroadcast('sending', 3)).toBe(false);
    expect(canRetryFailedEmailBroadcast('draft', 1)).toBe(false);
  });
});

describe('emailBroadcastFailureNotice', () => {
  it('does not treat last_error as a total failure when some deliveries succeeded', () => {
    expect(
      emailBroadcastFailureNotice({
        last_error: 'SMTP timeout on a subset of recipients',
        successful_deliveries: 12,
      }),
    ).toBeNull();
  });

  it('shows last_error when there were zero successes', () => {
    const notice = emailBroadcastFailureNotice({
      last_error: 'Provider rejected the campaign',
      successful_deliveries: 0,
    });
    expect(notice?.label).toMatch(/provider|rejected/i);
  });
});
