import { extractEmailBroadcasts, normalizeEmailBroadcast } from '../email-broadcasts';
import type { EmailBroadcast } from '@/types';

function makeBroadcast(partial: Partial<EmailBroadcast> = {}): EmailBroadcast {
  return {
    id: 12,
    subject: 'Weekend bonus',
    html_body: '<p>Hi {{ username }}</p>',
    audience: 'whitelabel',
    selected_user_ids: [],
    project_id: 3,
    scheduled_at: null,
    sent_at: '2026-08-03T12:00:00Z',
    status: 'completed',
    total_recipients: 120,
    successful_deliveries: 118,
    failed_deliveries: 1,
    skipped_deliveries: 1,
    last_error: '',
    ...partial,
  };
}

describe('extractEmailBroadcasts', () => {
  it('returns [] for null/undefined/empty', () => {
    expect(extractEmailBroadcasts(null)).toEqual([]);
    expect(extractEmailBroadcasts(undefined)).toEqual([]);
    expect(extractEmailBroadcasts({})).toEqual([]);
  });

  it('unwraps { results }', () => {
    const rows = [makeBroadcast()];
    expect(extractEmailBroadcasts({ results: rows })).toEqual(rows);
  });

  it('unwraps { broadcast }', () => {
    const row = makeBroadcast();
    expect(extractEmailBroadcasts({ broadcast: row })).toEqual([row]);
  });

  it('drops invalid rows', () => {
    const result = extractEmailBroadcasts([
      makeBroadcast(),
      { subject: 'no-id' } as unknown as EmailBroadcast,
    ]);
    expect(result).toHaveLength(1);
  });

  it('unwraps GET { status, data: { broadcast } } and coerces counts', () => {
    const row = makeBroadcast({ last_error: '' });
    const extracted = extractEmailBroadcasts({
      status: 'success',
      data: {
        broadcast: {
          ...row,
          id: '12' as unknown as number,
          successful_deliveries: '161' as unknown as number,
          failed_deliveries: '8' as unknown as number,
          last_error: "AttributeError: 'NoneType' object has no attribute 'admin'",
        },
      },
    });
    expect(extracted).toHaveLength(1);
    expect(extracted[0].id).toBe(12);
    expect(extracted[0].successful_deliveries).toBe(161);
    expect(extracted[0].failed_deliveries).toBe(8);
    expect(extracted[0].last_error).toMatch(/NoneType/);
  });

  it('maps preview exclusion_counts onto exclusion_summary when needed', () => {
    const normalized = normalizeEmailBroadcast({
      id: 9,
      subject: 'Hi',
      html_body: '<p></p>',
      audience: 'all_eligible',
      scheduled_at: null,
      sent_at: null,
      status: 'draft',
      exclusion_counts: { email_not_verified: '4' },
      exclusion_labels: { email_not_verified: 'Email not verified' },
    });
    expect(normalized?.exclusion_summary).toEqual({ email_not_verified: 4 });
  });
});
