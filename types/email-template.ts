/**
 * Dynamic event email templates (per-project).
 * Backend auto-creates defaults on list; admins PATCH by action key.
 */

export type EmailTemplateAction =
  | 'signup_otp'
  | 'password_reset'
  | 'account_created'
  | 'kyc_verified'
  | 'kyc_rejected'
  | 'purchase_success'
  | 'cashout_success'
  | 'referral_joined'
  | 'game_signup'
  | 'cashout_request';

export interface EmailTemplateDefaults {
  subject: string;
  header: string;
  body_message: string;
  banner: string;
}

export interface EmailTemplate {
  id: number;
  action: EmailTemplateAction | string;
  action_label: string;
  subject: string;
  header: string;
  body_message: string;
  banner: string;
  is_enabled: boolean;
  required_placeholders: string[];
  defaults?: EmailTemplateDefaults;
  created_by?: number | null;
  modified_at?: string | null;
}

export interface EmailTemplateActionMeta {
  action: string;
  label: string;
}

export interface EmailTemplatesListResponse {
  owner_id?: number;
  owner_username?: string;
  actions?: EmailTemplateActionMeta[];
  results: EmailTemplate[];
}

export interface EmailTemplateDetailResponse {
  template: EmailTemplate;
}

export interface UpdateEmailTemplateRequest {
  subject?: string;
  header?: string;
  body_message?: string;
  banner?: string;
  is_enabled?: boolean;
  whitelabel_admin_uuid?: string;
}

export interface UpdateEmailTemplateResponse {
  success: boolean;
  message: string;
  template: EmailTemplate;
}
