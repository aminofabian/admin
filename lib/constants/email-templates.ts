import type { EmailTemplate, EmailTemplateAction } from '@/types';

/**
 * Placeholders available inside email subjects / bodies.
 * `sample` values are used to render a live preview of a template.
 * Django-style tokens use spaces: {{ username }}
 * Header and banner are no longer separate template fields — put image links in the HTML body.
 */
export interface EmailTemplateVariable {
  key: string;
  label: string;
  sample: string;
}

export const EMAIL_TEMPLATE_VARIABLES: Record<string, EmailTemplateVariable> = {
  username: { key: 'username', label: 'Player username', sample: 'alex_player' },
  full_name: { key: 'full_name', label: 'Display name', sample: 'Alex Player' },
  logo: { key: 'logo', label: 'Project logo URL', sample: 'https://cdn.example.com/logo.png' },
  email_support: { key: 'email_support', label: 'Support email', sample: 'support@example.com' },
  telegram_support: { key: 'telegram_support', label: 'Support telegram', sample: '@support_bot' },
  otp: { key: 'otp', label: 'One-time verification code', sample: '482913' },
  reset_url: {
    key: 'reset_url',
    label: 'Password reset URL',
    sample: 'https://example.com/reset-password?token=abc123',
  },
  reason: {
    key: 'reason',
    label: 'KYC rejection reason',
    sample: 'The uploaded document was unclear or expired.',
  },
  amount: { key: 'amount', label: 'Transaction amount', sample: '50.00' },
  currency: { key: 'currency', label: 'Currency code', sample: 'USD' },
  transaction_id: { key: 'transaction_id', label: 'Transaction reference', sample: 'TXN-10293847' },
  balance: { key: 'balance', label: 'Account balance', sample: '125.50' },
  status: { key: 'status', label: 'Status', sample: 'completed' },
  date: { key: 'date', label: 'Date', sample: '2026-08-03' },
  referrer_username: { key: 'referrer_username', label: 'Referrer username', sample: 'referrer_one' },
  referred_username: { key: 'referred_username', label: 'Referred username', sample: 'new_player' },
  referral_code: { key: 'referral_code', label: 'Referral code', sample: 'PLAY50' },
  password: { key: 'password', label: 'Temporary password', sample: 'TempPass123!' },
  game_name: { key: 'game_name', label: 'Game name', sample: 'Lucky Slots' },
  banner: { key: 'banner', label: 'Banner image URL', sample: 'https://cdn.example.com/banner.png' },
  receiver_role: { key: 'receiver_role', label: 'Receiver role', sample: 'manager' },
  receiver_username: { key: 'receiver_username', label: 'Receiver username', sample: 'ops_manager' },
  project_name: { key: 'project_name', label: 'Brand / project name', sample: 'SlotThing' },
  unsubscribe_url: {
    key: 'unsubscribe_url',
    label: 'Unsubscribe link',
    sample: 'https://example.com/users/email/unsubscribe/?token=abc',
  },
};

/** Fallback labels when the API has not returned action_label yet. */
export const EMAIL_TEMPLATE_ACTION_LABELS: Record<EmailTemplateAction, string> = {
  signup_otp: 'SignUp OTP',
  password_reset: 'Password Reset',
  account_created: 'Account Successfully Created',
  kyc_verified: 'KYC Verification Completed',
  kyc_rejected: 'KYC Verification Rejected',
  purchase_success: 'Purchase Successful',
  cashout_success: 'Cashout Successful',
  referral_joined: 'Referral Joined',
  game_signup: 'Game signup',
  cashout_request: 'Cashout Alert',
};

export const EMAIL_TEMPLATE_ACTIONS: EmailTemplateAction[] = [
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
];

export function getEmailTemplateLabel(action: string): string {
  return EMAIL_TEMPLATE_ACTION_LABELS[action as EmailTemplateAction] || action;
}

/** Map placeholder keys to variable definitions (unknown keys get a generic chip). */
export function resolveEmailTemplateVariables(keys: string[]): EmailTemplateVariable[] {
  return keys.map((key) => {
    const known = EMAIL_TEMPLATE_VARIABLES[key];
    if (known) return known;
    return { key, label: key, sample: `[${key}]` };
  });
}

/** Format a Django-style placeholder token. */
export function emailPlaceholderToken(key: string): string {
  return `{{ ${key} }}`;
}

/**
 * Substitute sample values for placeholders in a template string.
 * Supports both `{{ key }}` and `{{key}}`.
 */
export function renderEmailPreview(html: string, variables: EmailTemplateVariable[]): string {
  let rendered = html;
  for (const variable of variables) {
    const spaced = emailPlaceholderToken(variable.key);
    const compact = `{{${variable.key}}}`;
    rendered = rendered.split(spaced).join(variable.sample);
    rendered = rendered.split(compact).join(variable.sample);
  }
  return rendered;
}

/** Prefer API label; fall back to known labels. */
export function displayEmailTemplateLabel(template: Pick<EmailTemplate, 'action' | 'action_label'>): string {
  return template.action_label || getEmailTemplateLabel(template.action);
}
