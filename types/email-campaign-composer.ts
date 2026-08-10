/**
 * Brand-level email campaign composer draft + filter-builder types.
 */

export type EmailCampaignRecipientMethod = 'specific' | 'filtered' | 'all';

export type EmailCampaignSsnFilter = 'any' | 'verified' | 'unverified';

export type EmailCampaignMatchMode = 'all' | 'any';

export type EmailCampaignFilterField =
  | 'account_status'
  | 'registration_date'
  | 'email_verification'
  | 'kyc_status'
  | 'last_active_date'
  | 'first_purchase'
  | 'last_purchase_date'
  | 'total_purchase_amount'
  | 'number_of_purchases'
  | 'current_balance'
  | 'marketing_eligibility'
  | 'ssn_verified'
  | 'state';

export type EmailCampaignFilterOperator =
  | 'is'
  | 'is_not'
  | 'before'
  | 'after'
  | 'between'
  | 'last_x_days'
  | 'never'
  | 'greater_than'
  | 'less_than'
  | 'equal_to'
  | 'in';

export interface EmailCampaignSelectedPlayer {
  id: number;
  username: string;
  email: string;
}

export interface EmailCampaignFilterRow {
  id: string;
  field: EmailCampaignFilterField;
  operator: EmailCampaignFilterOperator;
  value: string;
  /** Secondary value for between ranges */
  value_to?: string;
}

export interface EmailCampaignComposerDraft {
  internal_name: string;
  subject: string;
  html_body: string;
  recipient_method: EmailCampaignRecipientMethod;
  selected_players: EmailCampaignSelectedPlayer[];
  match_mode: EmailCampaignMatchMode;
  filter_rows: EmailCampaignFilterRow[];
  /** @deprecated Prefer filter_rows; kept for draft migration */
  deposit_min?: string;
  /** @deprecated Prefer filter_rows */
  deposit_max?: string;
  /** @deprecated Prefer filter_rows */
  ssn_filter?: EmailCampaignSsnFilter;
  /** @deprecated Prefer filter_rows — US state codes */
  states?: string[];
  template_id?: number | null;
  updated_at?: string;
}

export type EmailCampaignComposerStep = 'edit' | 'review';

export interface EmailCampaignRecipientPreview {
  matched: number | null;
  excluded: number | null;
  final: number | null;
  loading: boolean;
  error: string | null;
  /** Filters that cannot be applied by the players list / broadcast API yet */
  unsupported: string[];
}
