import { describe, expect, it } from 'vitest';
import {
  canCancelEmailBroadcast,
  canEditEmailBroadcast,
  canRetryFailedEmailBroadcast,
  canSendEmailBroadcast,
  emailBroadcastFailureNotice,
  emailBroadcastPartialRetryNotice,
  formatEmailBroadcastExclusionBreakdown,
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
    expect(formatEmailBroadcastExclusionReason('unsubscribed')).toBe('Unsubscribed');
    expect(formatEmailBroadcastExclusionReason('bounced')).toBe('Hard bounce');
    expect(formatEmailBroadcastExclusionReason('inactive')).toBe('Inactive');
    expect(formatEmailBroadcastExclusionReason('archived')).toBe('Archived');
    expect(formatEmailBroadcastExclusionReason('spam_complaint')).toBe('Spam complaint');
    expect(formatEmailBroadcastExclusionReason('missing_email')).toBe('Missing email');
  });

  it('prefers API-provided exclusion_labels over hardcoded English', () => {
    expect(
      formatEmailBroadcastExclusionReason('email_not_verified', {
        email_not_verified: 'Email not verified (API)',
      }),
    ).toBe('Email not verified (API)');
    expect(
      formatEmailBroadcastExclusionReason('brand_hold', {
        brand_hold: 'Held by brand policy',
      }),
    ).toBe('Held by brand policy');
  });

  it('falls back for unknown codes and empty values', () => {
    expect(formatEmailBroadcastExclusionReason(null)).toBe('Excluded');
    expect(formatEmailBroadcastExclusionReason('custom_hold')).toBe('custom hold');
  });
});

describe('formatEmailBroadcastExclusionBreakdown', () => {
  it('joins API labels with counts', () => {
    expect(
      formatEmailBroadcastExclusionBreakdown(
        { email_not_verified: 12, frequency_limit: 3 },
        { email_not_verified: 'Email not verified (API)' },
      ),
    ).toBe('Email not verified (API) 12 · Frequency limit reached 3');
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
    expect(canRetryFailedEmailBroadcast('queued', 3)).toBe(false);
    expect(canRetryFailedEmailBroadcast('scheduled', 3)).toBe(false);
    expect(canRetryFailedEmailBroadcast('draft', 1)).toBe(false);
  });
});

describe('emailBroadcastFailureNotice', () => {
  it('does not treat last_error as a total failure when some deliveries succeeded', () => {
    expect(
      emailBroadcastFailureNotice({
        last_error: "AttributeError: 'NoneType' object has no attribute 'admin'",
        successful_deliveries: 161,
        status: 'completed',
      }),
    ).toBeNull();
  });

  it('does not treat leftover last_error as a wipeout when completed counts are missing', () => {
    expect(
      emailBroadcastFailureNotice({
        last_error: "AttributeError: 'NoneType' object has no attribute 'admin'",
        status: 'completed',
      }),
    ).toBeNull();
  });

  it('shows last_error when there were zero successes', () => {
    const notice = emailBroadcastFailureNotice({
      last_error: 'Provider rejected the campaign',
      successful_deliveries: 0,
      status: 'failed',
    });
    expect(notice?.label).toMatch(/provider|rejected/i);
  });
});

describe('emailBroadcastPartialRetryNotice', () => {
  it('warns with sent/failed counts when some deliveries succeeded', () => {
    expect(
      emailBroadcastPartialRetryNotice({
        successful_deliveries: 161,
        failed_deliveries: 8,
      }),
    ).toBe('161 sent, 8 failed — Retry failed');
  });

  it('is null when there is no mix of sent and failed', () => {
    expect(
      emailBroadcastPartialRetryNotice({
        successful_deliveries: 10,
        failed_deliveries: 0,
      }),
    ).toBeNull();
    expect(
      emailBroadcastPartialRetryNotice({
        successful_deliveries: 0,
        failed_deliveries: 4,
      }),
    ).toBeNull();
  });
});
