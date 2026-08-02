import {
  EMAIL_TEMPLATE_DEFAULTS,
  getEmailTemplateMeta,
  getEmailTemplateVariables,
  mergeEmailTemplates,
  renderEmailPreview,
} from '../email-templates';
import type { EmailTemplate } from '@/types';

describe('EMAIL_TEMPLATE_DEFAULTS', () => {
  it('covers every requested event plus the campaign template', () => {
    const types = EMAIL_TEMPLATE_DEFAULTS.map((t) => t.template_type);
    expect(types).toEqual([
      'signup_otp',
      'account_created',
      'kyc_approved',
      'kyc_rejected',
      'forgot_password',
      'purchase_success',
      'cashout_success',
      'referral_joined',
      'campaign_promo',
    ]);
  });

  it('every template has a subject and a body', () => {
    for (const template of EMAIL_TEMPLATE_DEFAULTS) {
      expect(template.subject.length).toBeGreaterThan(0);
      expect(template.body.length).toBeGreaterThan(0);
    }
  });
});

describe('getEmailTemplateVariables', () => {
  it('returns defined variables for a known type', () => {
    const variables = getEmailTemplateVariables('signup_otp');
    expect(variables.map((v) => v.key)).toEqual([
      'first_name',
      'company_name',
      'otp_code',
      'support_email',
    ]);
  });

  it('returns an empty list for unknown types', () => {
    expect(getEmailTemplateVariables('unknown_type')).toEqual([]);
  });
});

describe('mergeEmailTemplates', () => {
  it('keeps backend customization when a row exists', () => {
    const row: EmailTemplate = {
      id: 7,
      template_type: 'signup_otp',
      name: 'Sign-up OTP',
      category: 'event',
      subject: 'Custom subject',
      body: '<p>Custom body</p>',
      is_active: false,
      is_customized: true,
    };

    const merged = mergeEmailTemplates([row]);
    const otp = merged.find((t) => t.template_type === 'signup_otp');

    expect(otp).toMatchObject({
      id: 7,
      subject: 'Custom subject',
      body: '<p>Custom body</p>',
      is_active: false,
      is_customized: true,
    });
    expect(merged).toHaveLength(EMAIL_TEMPLATE_DEFAULTS.length);
  });

  it('falls back to defaults for missing templates with id null', () => {
    const merged = mergeEmailTemplates([]);
    const otp = merged.find((t) => t.template_type === 'signup_otp');

    expect(otp).toMatchObject({
      id: null,
      subject: getEmailTemplateMeta('signup_otp')?.subject,
      is_active: true,
      is_customized: false,
    });
    expect(merged).toHaveLength(EMAIL_TEMPLATE_DEFAULTS.length);
  });
});

describe('renderEmailPreview', () => {
  it('replaces placeholders with sample values', () => {
    const html = '<p>Hi {{first_name}}, your code is {{otp_code}}.</p>';
    const rendered = renderEmailPreview(html, getEmailTemplateVariables('signup_otp'));

    expect(rendered).toContain('Hi Alex, your code is 482913.');
    expect(rendered).not.toContain('{{first_name}}');
    expect(rendered).not.toContain('{{otp_code}}');
  });

  it('leaves unknown placeholders untouched', () => {
    const rendered = renderEmailPreview('{{unknown}}', []);
    expect(rendered).toBe('{{unknown}}');
  });
});
