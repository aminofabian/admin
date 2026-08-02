import {
  EMAIL_TEMPLATE_CATEGORIES,
  type EmailTemplate,
  type EmailTemplateCategory,
  type EmailTemplateType,
} from '@/types';

/**
 * Placeholders available inside email subjects/bodies.
 * `sample` values are used to render a live preview of a template.
 */
export interface EmailTemplateVariable {
  key: string;
  label: string;
  sample: string;
}

export const EMAIL_TEMPLATE_VARIABLES: Record<string, EmailTemplateVariable> = {
  first_name: { key: 'first_name', label: 'Player first name', sample: 'Alex' },
  company_name: { key: 'company_name', label: 'Company / brand name', sample: 'SlotThing' },
  otp_code: { key: 'otp_code', label: 'One-time verification code', sample: '482913' },
  login_url: { key: 'login_url', label: 'Login page URL', sample: 'https://slotthing.com/login' },
  reset_link: {
    key: 'reset_link',
    label: 'Password reset link',
    sample: 'https://slotthing.com/reset-password?token=abc123',
  },
  kyc_reason: {
    key: 'kyc_reason',
    label: 'KYC rejection reason',
    sample: 'The uploaded document was unclear or expired.',
  },
  amount: { key: 'amount', label: 'Transaction amount', sample: '$50.00' },
  transaction_id: { key: 'transaction_id', label: 'Transaction reference', sample: 'TXN-10293847' },
  referred_player: {
    key: 'referred_player',
    label: 'Referred player name',
    sample: 'Jordan',
  },
  support_email: { key: 'support_email', label: 'Support email', sample: 'support@slotthing.com' },
  campaign_title: {
    key: 'campaign_title',
    label: 'Campaign / promotion title',
    sample: 'Double Deposit Weekend',
  },
};

export interface EmailTemplateMeta {
  template_type: EmailTemplateType;
  name: string;
  description: string;
  category: EmailTemplateCategory;
  subject: string;
  body: string;
  variables: string[];
}

/**
 * Shared email HTML shell. Inline styles only so it renders in every email client.
 */
function buildEmailHtml(options: {
  preheader: string;
  content: string;
  cta?: { label: string; url: string };
}): string {
  const ctaBlock = options.cta
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0 4px;">
      <tr>
        <td align="center" style="border-radius: 8px; background: #6366f1;">
          <a href="${options.cta.url}" target="_blank"
             style="display: inline-block; padding: 13px 28px; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none;">
            ${options.cta.label}
          </a>
        </td>
      </tr>
    </table>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${options.preheader}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f3f4f6;">
    <div style="display: none; max-height: 0; overflow: hidden;">${options.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                 style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="background: #6366f1; padding: 24px 32px;">
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                  {{company_name}}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; font-family: Arial, sans-serif; color: #1f2937;">
                ${options.content}
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 32px; border-top: 1px solid #e5e7eb; background: #fafafa;">
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #6b7280;">
                  You are receiving this email because you have an account on {{company_name}}.<br />
                  Questions? Contact us at <a href="mailto:{{support_email}}" style="color: #6366f1;">{{support_email}}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const otpBody = buildEmailHtml({
  preheader: 'Your {{company_name}} verification code',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">Verify your email</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6;">
      Use the code below to complete your sign-up on {{company_name}}:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 20px;">
      <tr>
        <td align="center" style="padding: 16px 36px; background: #eef2ff; border: 2px dashed #6366f1; border-radius: 10px;">
          <span style="font-family: 'Courier New', monospace; font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #4338ca;">{{otp_code}}</span>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #6b7280;">
      This code expires in 10 minutes. If you did not request it, you can safely ignore this email.
    </p>`,
});

const accountCreatedBody = buildEmailHtml({
  preheader: 'Welcome to {{company_name}}',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">Welcome aboard, {{first_name}}! 🎉</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      Your account on {{company_name}} has been created successfully. You are all set to explore the platform,
      claim bonuses, and start playing.
    </p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      Head over to the login page to get started:
    </p>`,
  cta: { label: 'Log in now', url: '{{login_url}}' },
});

const kycApprovedBody = buildEmailHtml({
  preheader: 'Your identity verification is complete',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">Identity verified ✅</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      Great news — your KYC verification on {{company_name}} has been completed. You now have access to all
      platform features, including purchases and cashouts.
    </p>
    <p style="margin: 0; font-size: 15px; line-height: 1.6;">Thanks for verifying your identity!</p>`,
  cta: { label: 'Go to your account', url: '{{login_url}}' },
});

const kycRejectedBody = buildEmailHtml({
  preheader: 'Action needed — identity verification',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">We could not verify your identity</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      Unfortunately, your KYC verification on {{company_name}} was rejected for the following reason:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 16px;">
      <tr>
        <td style="padding: 12px 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
          <span style="font-family: Arial, sans-serif; font-size: 14px; color: #7f1d1d;">{{kyc_reason}}</span>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      Please re-submit your documents and try again. If you need help, reach out to
      <a href="mailto:{{support_email}}" style="color: #6366f1;">{{support_email}}</a>.
    </p>`,
  cta: { label: 'Try again', url: '{{login_url}}' },
});

const forgotPasswordBody = buildEmailHtml({
  preheader: 'Reset your {{company_name}} password',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">Reset your password</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      We received a request to reset the password for your {{company_name}} account. Click the button below
      to choose a new password:
    </p>
    <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #6b7280;">
      This link expires in 30 minutes. If you did not request a password reset, you can safely ignore this email.
    </p>`,
  cta: { label: 'Reset password', url: '{{reset_link}}' },
});

const purchaseSuccessBody = buildEmailHtml({
  preheader: 'Your purchase of {{amount}} was successful',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">Purchase confirmed ✅</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      Your purchase of <strong>{{amount}}</strong> on {{company_name}} was successful.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 16px;">
      <tr>
        <td style="padding: 12px 16px; background: #f9fafb; border-radius: 8px;">
          <span style="font-family: Arial, sans-serif; font-size: 13px; color: #6b7280;">
            Reference: <strong style="color: #1f2937;">{{transaction_id}}</strong>
          </span>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 15px; line-height: 1.6;">Enjoy the game!</p>`,
  cta: { label: 'View my account', url: '{{login_url}}' },
});

const cashoutSuccessBody = buildEmailHtml({
  preheader: 'Your cashout of {{amount}} was successful',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">Cashout processed 💸</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      Your cashout of <strong>{{amount}}</strong> from {{company_name}} was successful.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 16px;">
      <tr>
        <td style="padding: 12px 16px; background: #f9fafb; border-radius: 8px;">
          <span style="font-family: Arial, sans-serif; font-size: 13px; color: #6b7280;">
            Reference: <strong style="color: #1f2937;">{{transaction_id}}</strong>
          </span>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 15px; line-height: 1.6;">
      The funds should appear in your payout method shortly.
    </p>`,
});

const referralJoinedBody = buildEmailHtml({
  preheader: 'Someone joined with your referral',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">You made a referral! 🎉</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      <strong>{{referred_player}}</strong> just signed up on {{company_name}} using your referral link.
    </p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      Once they make their first purchase, your referral reward will be credited automatically.
    </p>
    <p style="margin: 0; font-size: 15px; line-height: 1.6;">Keep sharing your link to earn more!</p>`,
  cta: { label: 'See my rewards', url: '{{login_url}}' },
});

const campaignPromoBody = buildEmailHtml({
  preheader: '{{campaign_title}} at {{company_name}}',
  content: `
    <h1 style="margin: 0 0 16px; font-size: 22px;">{{campaign_title}}</h1>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6;">
      We have something special for you at {{company_name}}. Log in to see the details of this limited-time
      offer before it is gone.
    </p>
    <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #6b7280;">
      Offer is subject to terms and availability. Contact
      <a href="mailto:{{support_email}}" style="color: #6366f1;">{{support_email}}</a> for questions.
    </p>`,
  cta: { label: 'Claim the offer', url: '{{login_url}}' },
});

/**
 * Default templates seeded per company. The backend is expected to mirror these;
 * the frontend uses them as a fallback so every template is always visible.
 */
export const EMAIL_TEMPLATE_DEFAULTS: EmailTemplateMeta[] = [
  {
    template_type: 'signup_otp',
    name: 'Sign-up OTP',
    description: 'Sent when a player requests a one-time code to verify their email at sign-up.',
    category: EMAIL_TEMPLATE_CATEGORIES.EVENT,
    subject: 'Your {{company_name}} verification code',
    body: otpBody,
    variables: ['first_name', 'company_name', 'otp_code', 'support_email'],
  },
  {
    template_type: 'account_created',
    name: 'Account Created',
    description: 'Sent after a player account is successfully created.',
    category: EMAIL_TEMPLATE_CATEGORIES.EVENT,
    subject: 'Welcome to {{company_name}}!',
    body: accountCreatedBody,
    variables: ['first_name', 'company_name', 'login_url', 'support_email'],
  },
  {
    template_type: 'kyc_approved',
    name: 'KYC Approved',
    description: 'Sent when a player’s identity verification is completed.',
    category: EMAIL_TEMPLATE_CATEGORIES.EVENT,
    subject: 'Your identity verification is complete',
    body: kycApprovedBody,
    variables: ['first_name', 'company_name', 'login_url', 'support_email'],
  },
  {
    template_type: 'kyc_rejected',
    name: 'KYC Rejected',
    description: 'Sent when a player’s identity verification is rejected.',
    category: EMAIL_TEMPLATE_CATEGORIES.EVENT,
    subject: 'Action needed — identity verification',
    body: kycRejectedBody,
    variables: ['first_name', 'company_name', 'kyc_reason', 'login_url', 'support_email'],
  },
  {
    template_type: 'forgot_password',
    name: 'Forgot Password',
    description: 'Sent when a player requests a password reset link.',
    category: EMAIL_TEMPLATE_CATEGORIES.EVENT,
    subject: 'Reset your {{company_name}} password',
    body: forgotPasswordBody,
    variables: ['first_name', 'company_name', 'reset_link', 'support_email'],
  },
  {
    template_type: 'purchase_success',
    name: 'Purchase Successful',
    description: 'Sent after a player’s purchase is completed.',
    category: EMAIL_TEMPLATE_CATEGORIES.EVENT,
    subject: 'Your purchase of {{amount}} was successful',
    body: purchaseSuccessBody,
    variables: ['first_name', 'company_name', 'amount', 'transaction_id', 'login_url', 'support_email'],
  },
  {
    template_type: 'cashout_success',
    name: 'Cashout Successful',
    description: 'Sent after a player’s cashout is completed.',
    category: EMAIL_TEMPLATE_CATEGORIES.EVENT,
    subject: 'Your cashout of {{amount}} was successful',
    body: cashoutSuccessBody,
    variables: ['first_name', 'company_name', 'amount', 'transaction_id', 'support_email'],
  },
  {
    template_type: 'referral_joined',
    name: 'Referral Joined',
    description: 'Sent to the referrer when a new player signs up with their referral link.',
    category: EMAIL_TEMPLATE_CATEGORIES.EVENT,
    subject: 'Someone joined with your referral',
    body: referralJoinedBody,
    variables: ['first_name', 'company_name', 'referred_player', 'login_url', 'support_email'],
  },
  {
    template_type: 'campaign_promo',
    name: 'Campaign / Promotional',
    description: 'Scheduled marketing emails sent to players (e.g. bonus campaigns).',
    category: EMAIL_TEMPLATE_CATEGORIES.CAMPAIGN,
    subject: '{{campaign_title}} at {{company_name}}',
    body: campaignPromoBody,
    variables: ['first_name', 'company_name', 'campaign_title', 'login_url', 'support_email'],
  },
];

/** Look up default metadata for a template type. */
export function getEmailTemplateMeta(type: string): EmailTemplateMeta | undefined {
  return EMAIL_TEMPLATE_DEFAULTS.find((meta) => meta.template_type === type);
}

/** Map a template type to its variable definitions (unknown types get an empty list). */
export function getEmailTemplateVariables(type: string): EmailTemplateVariable[] {
  const meta = getEmailTemplateMeta(type);
  if (!meta) return [];
  return meta.variables
    .map((key) => EMAIL_TEMPLATE_VARIABLES[key])
    .filter((variable): variable is EmailTemplateVariable => Boolean(variable));
}

/**
 * Merge backend rows with the default templates.
 * Backend rows win when they exist; missing templates appear as defaults
 * (id: null) so they can be created on first save.
 */
export function mergeEmailTemplates(backendRows: EmailTemplate[]): EmailTemplate[] {
  const byType = new Map(backendRows.map((row) => [row.template_type, row]));

  return EMAIL_TEMPLATE_DEFAULTS.map((meta) => {
    const row = byType.get(meta.template_type);
    if (row) {
      return {
        id: row.id ?? null,
        template_type: row.template_type,
        name: row.name || meta.name,
        category: row.category || meta.category,
        description: row.description || meta.description,
        subject: row.subject,
        body: row.body,
        is_active: row.is_active !== false,
        is_customized: Boolean(row.is_customized),
        created: row.created,
        modified: row.modified,
      };
    }
    return {
      id: null,
      template_type: meta.template_type,
      name: meta.name,
      category: meta.category,
      description: meta.description,
      subject: meta.subject,
      body: meta.body,
      is_active: true,
      is_customized: false,
    };
  });
}

/**
 * Substitute sample values for every placeholder in a template body.
 * Used to render a realistic preview in the editor.
 */
export function renderEmailPreview(html: string, variables: EmailTemplateVariable[]): string {
  let rendered = html;
  for (const variable of variables) {
    rendered = rendered.split(`{{${variable.key}}}`).join(variable.sample);
  }
  return rendered;
}
