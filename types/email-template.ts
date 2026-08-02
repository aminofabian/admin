/**
 * Email template types.
 *
 * Templates are per-company: the backend seeds a default set when a company is
 * created, and admins can customize the subject/body (or disable) each one.
 * The admin dashboard merges backend rows with frontend defaults so every
 * template always appears in the UI, even before it has been persisted.
 */

export const EMAIL_TEMPLATE_CATEGORIES = {
  EVENT: 'event',
  CAMPAIGN: 'campaign',
} as const;

export type EmailTemplateCategory =
  (typeof EMAIL_TEMPLATE_CATEGORIES)[keyof typeof EMAIL_TEMPLATE_CATEGORIES];

export type EmailTemplateType =
  | 'signup_otp'
  | 'account_created'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'forgot_password'
  | 'purchase_success'
  | 'cashout_success'
  | 'referral_joined'
  | 'campaign_promo';

export interface EmailTemplate {
  /** Backend row id; null when the template only exists as a frontend default. */
  id: number | null;
  template_type: EmailTemplateType;
  name: string;
  category: EmailTemplateCategory;
  /** Short human description shown in the admin UI (merged from defaults). */
  description?: string;
  subject: string;
  body: string;
  is_active: boolean;
  /** True once the company has saved a custom subject/body for this template. */
  is_customized: boolean;
  created?: string;
  modified?: string;
}

export interface CreateEmailTemplateRequest {
  template_type: EmailTemplateType;
  subject: string;
  body: string;
  is_active?: boolean;
}

export interface UpdateEmailTemplateRequest {
  subject?: string;
  body?: string;
  is_active?: boolean;
  is_customized?: boolean;
}
