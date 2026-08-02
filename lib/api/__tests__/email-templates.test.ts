import { extractEmailTemplates } from '../email-templates';
import type { EmailTemplate } from '@/types';

function makeTemplate(partial: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    id: 1,
    template_type: 'signup_otp',
    name: 'Sign-up OTP',
    category: 'event',
    subject: 'Your code',
    body: '<p>Hi</p>',
    is_active: true,
    is_customized: false,
    ...partial,
  };
}

describe('extractEmailTemplates', () => {
  it('returns [] for null/undefined/empty', () => {
    expect(extractEmailTemplates(null)).toEqual([]);
    expect(extractEmailTemplates(undefined)).toEqual([]);
    expect(extractEmailTemplates({})).toEqual([]);
  });

  it('passes through a plain array', () => {
    const rows = [makeTemplate(), makeTemplate({ id: 2, template_type: 'cashout_success' })];
    expect(extractEmailTemplates(rows)).toEqual(rows);
  });

  it('unwraps a DRF { results } list', () => {
    const rows = [makeTemplate()];
    expect(extractEmailTemplates({ results: rows })).toEqual(rows);
  });

  it('unwraps a { data: [...] } envelope', () => {
    const rows = [makeTemplate()];
    expect(extractEmailTemplates({ status: 'success', data: rows })).toEqual(rows);
  });

  it('unwraps { data: { results } }', () => {
    const rows = [makeTemplate()];
    expect(extractEmailTemplates({ data: { results: rows } })).toEqual(rows);
  });

  it('unwraps a single object in data', () => {
    const row = makeTemplate();
    expect(extractEmailTemplates({ data: row })).toEqual([row]);
  });

  it('drops rows that do not look like templates', () => {
    const rows = [makeTemplate(), { id: 99, foo: 'bar' } as unknown as EmailTemplate];
    const result = extractEmailTemplates(rows);
    expect(result).toHaveLength(1);
    expect(result[0].template_type).toBe('signup_otp');
  });
});
