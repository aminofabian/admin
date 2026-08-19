import type { EmailBroadcastExcludedPlayerSample, EmailBroadcastFinalPlayerSample } from './email-broadcast';

/**
 * Brand-level email campaign composer draft + filter-builder types.
 *
 * The wire format (POST /api/v1/email/broadcasts/) uses:
 * - audience: 'specific' | 'filtered' | 'all_eligible'
 * - filter rows: { field, op, value } with filter_match: 'all' | 'any'
 */

export type EmailCampaignRecipientMethod = 'specific' | 'filtered' | 'all_eligible';

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
  | 'marketing_eligibility';

export type EmailCampaignFilterOperator =
  | 'eq'
  | 'before'
  | 'after'
  | 'between'
  | 'last_x_days'
  | 'never'
  | 'gt'
  | 'lt';

export interface EmailCampaignSelectedPlayer {
  id: number;
  username: string;
  email: string;
  /** Set when the player cannot receive marketing email (auto-excluded on send). */
  exclusion_reason?: string | null;
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
  /** Saved draft id returned by POST /email/broadcasts/ with save_as_draft: true */
  broadcast_id?: number | null;
  /** @deprecated Prefer filter_rows; kept for draft migration */
  deposit_min?: string;
  /** @deprecated Prefer filter_rows */
  deposit_max?: string;
  template_id?: number | null;
  updated_at?: string;
  /** API allowed_variables when known (source of truth for {{ }} tokens). */
  allowed_variables?: string[] | null;
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
  /** Breakdown of automatic exclusions by reason (unsubscribed, email_not_verified, …) */
  exclusion_counts?: Record<string, number>;
  /** API-provided UI labels for exclusion reason codes. */
  exclusion_labels?: Record<string, string>;
  /** Template variables the backend will interpolate (includes spins_left). */
  allowed_variables?: string[];
  /** Sample of excluded players returned by the preview API. */
  excluded_sample?: EmailBroadcastExcludedPlayerSample[];
  /** Sample of final (deliverable) players returned by the preview API. */
  final_sample?: EmailBroadcastFinalPlayerSample[];
}
