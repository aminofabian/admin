import { extractEmailBroadcasts } from '../email-broadcasts';
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
});
