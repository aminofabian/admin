import { extractEmailCampaignTemplates } from '../email-campaign-templates';
import type { EmailCampaignTemplate } from '@/types';

function makeTemplate(partial: Partial<EmailCampaignTemplate> = {}): EmailCampaignTemplate {
  return {
    id: 7,
    name: 'Weekend promo',
    subject: 'Bonus for {{ username }}',
    html_body: '<p>Hi {{ username }}</p>',
    ...partial,
  };
}

describe('extractEmailCampaignTemplates', () => {
  it('returns [] for null/undefined/empty', () => {
    expect(extractEmailCampaignTemplates(null)).toEqual([]);
    expect(extractEmailCampaignTemplates(undefined)).toEqual([]);
    expect(extractEmailCampaignTemplates({})).toEqual([]);
  });

  it('unwraps { results }', () => {
    const rows = [makeTemplate()];
    expect(extractEmailCampaignTemplates({ results: rows })).toEqual(rows);
  });

  it('unwraps { template }', () => {
    const row = makeTemplate();
    expect(extractEmailCampaignTemplates({ template: row })).toEqual([row]);
  });

  it('drops invalid rows', () => {
    const result = extractEmailCampaignTemplates([
      makeTemplate(),
      { name: 'no-id' } as unknown as EmailCampaignTemplate,
    ]);
    expect(result).toHaveLength(1);
  });
});
