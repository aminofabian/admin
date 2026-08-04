import {
  EMAIL_TEMPLATE_ACTIONS,
  emailPlaceholderToken,
  getEmailTemplateLabel,
  renderEmailPreview,
  resolveEmailTemplateVariables,
} from '../email-templates';

describe('EMAIL_TEMPLATE_ACTIONS', () => {
  it('covers every handoff event action', () => {
    expect(EMAIL_TEMPLATE_ACTIONS).toEqual([
      'signup_otp',
      'password_reset',
      'account_created',
      'kyc_verified',
      'kyc_rejected',
      'purchase_success',
      'cashout_success',
      'referral_joined',
      'game_signup',
      'cashout_request',
    ]);
  });
});

describe('getEmailTemplateLabel', () => {
  it('returns known labels', () => {
    expect(getEmailTemplateLabel('kyc_verified')).toBe('KYC Verification Completed');
    expect(getEmailTemplateLabel('password_reset')).toBe('Password Reset');
  });

  it('falls back to the action key for unknown types', () => {
    expect(getEmailTemplateLabel('custom_action')).toBe('custom_action');
  });
});

describe('resolveEmailTemplateVariables', () => {
  it('returns defined variables for known keys', () => {
    const variables = resolveEmailTemplateVariables(['username', 'otp', 'email_support']);
    expect(variables.map((v) => v.key)).toEqual(['username', 'otp', 'email_support']);
    expect(variables[0].sample).toBe('alex_player');
  });

  it('creates a generic chip for unknown keys', () => {
    const variables = resolveEmailTemplateVariables(['mystery_token']);
    expect(variables).toEqual([{ key: 'mystery_token', label: 'mystery_token', sample: '[mystery_token]' }]);
  });
});

describe('renderEmailPreview', () => {
  it('replaces spaced and compact placeholders with sample values', () => {
    const html = '<p>Hi {{ username }}, code {{otp}}.</p>';
    const rendered = renderEmailPreview(
      html,
      resolveEmailTemplateVariables(['username', 'otp']),
    );

    expect(rendered).toContain('Hi alex_player, code 482913.');
    expect(rendered).not.toContain('{{ username }}');
    expect(rendered).not.toContain('{{otp}}');
  });

  it('leaves unknown placeholders untouched', () => {
    const rendered = renderEmailPreview('{{ unknown }}', []);
    expect(rendered).toBe('{{ unknown }}');
  });
});

describe('emailPlaceholderToken', () => {
  it('formats Django-style tokens', () => {
    expect(emailPlaceholderToken('username')).toBe('{{ username }}');
  });
});
