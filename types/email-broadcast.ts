/**
 * Marketing email broadcasts / scheduled campaigns (brand-scoped).
 *
 * Wire format (POST /api/v1/email/broadcasts/):
 * - audience: 'specific' (user_ids[]) | 'filtered' (filters[] + filter_match) | 'all_eligible'
 * - filters: [{ field, op, value }], filter_match: 'all' | 'any'
 *
 * Legacy fields (deposit_min / deposit_max / ssn_verified / states) are kept
 * for backward compatibility with earlier backend versions.
 */

export type EmailBroadcastAudience =
  | 'specific'
  | 'filtered'
  | 'all_eligible'
  | 'all'
  | 'selected'
  | 'whitelabel';

export type EmailBroadcastStatus =
  | 'draft'
  | 'queued'
  | 'scheduled'
  | 'sending'
  | 'completed'
  | 'failed';

/** SSN filter: omit / null = any players (legacy) */
export type EmailBroadcastSsnVerified = boolean | null;

/** Legacy audience criteria (deposit/SSN/state) */
export interface EmailBroadcastAudienceCriteria {
  /** Lifetime completed deposits ≥ this amount */
  deposit_min?: number | null;
  /** Lifetime completed deposits ≤ this amount */
  deposit_max?: number | null;
  /** true = verified, false = unverified, null/undefined = any (is_identity_verified) */
  ssn_verified?: EmailBroadcastSsnVerified;
  /** Case-insensitive match on player.state, e.g. ["California", "Texas"] */
  states?: string[];
}

/** One filter row in the new { field, op, value } wire format. */
export interface EmailBroadcastFilterPayload {
  field: string;
  op: string;
  value: string | number | (string | number)[] | null;
}

export interface EmailBroadcast extends EmailBroadcastAudienceCriteria {
  id: number;
  /** Staff-facing internal name (new backend). */
  name?: string;
  subject: string;
  html_body: string;
  audience: EmailBroadcastAudience | string;
  /** New backend filter rows. */
  filters?: EmailBroadcastFilterPayload[] | null;
  filter_match?: 'all' | 'any' | null;
  /** Nested legacy filters returned by list API (preferred over flat fields when present) */
  audience_filters?: EmailBroadcastAudienceCriteria | null;
  selected_user_ids?: number[];
  user_ids?: number[];
  project_id?: number | null;
  template_id?: number | null;
  scheduled_at: string | null;
  sent_at: string | null;
  status: EmailBroadcastStatus | string;
  total_recipients?: number;
  successful_deliveries?: number;
  failed_deliveries?: number;
  skipped_deliveries?: number;
  last_error?: string;
  created?: string;
  modified?: string;
}

/** Prefill compose from a saved template or a prior campaign (“Reuse template”). */
export interface EmailBroadcastComposeDraft {
  subject: string;
  html_body: string;
  audience?: EmailBroadcastAudience | string;
  user_ids?: number[];
  deposit_min?: number | null;
  deposit_max?: number | null;
  ssn_verified?: EmailBroadcastSsnVerified;
  states?: string[];
  /** Saved campaign template id, when reusing from the templates library */
  template_id?: number | null;
  template_name?: string;
}

export interface EmailBroadcastsListResponse {
  results: EmailBroadcast[];
}

export interface CreateEmailBroadcastRequest extends EmailBroadcastAudienceCriteria {
  /** Staff-facing internal name (required by the new backend). */
  name?: string;
  subject: string;
  html_body: string;
  audience: EmailBroadcastAudience;
  whitelabel_admin_uuid?: string;
  user_ids?: number[];
  filters?: EmailBroadcastFilterPayload[];
  filter_match?: 'all' | 'any';
  /** true → save draft without sending; false → queue send now */
  save_as_draft?: boolean;
  scheduled_at?: string;
  /** Optional saved campaign template used to compose this send */
  template_id?: number;
}

export interface CreateEmailBroadcastResponse {
  success: boolean;
  message: string;
  task_id?: string;
  broadcast: EmailBroadcast;
}

/** POST /email/broadcasts/preview/ request body. */
export interface EmailBroadcastPreviewRequest {
  audience: EmailBroadcastAudience;
  user_ids?: number[];
  filters?: EmailBroadcastFilterPayload[];
  filter_match?: 'all' | 'any';
}

export interface EmailBroadcastExcludedPlayerSample {
  user_id: number;
  username: string;
  email: string;
  reason: string;
}

export interface EmailBroadcastFinalPlayerSample {
  user_id: number;
  username: string;
  email: string;
}

/** POST /email/broadcasts/preview/ response. */
export interface EmailBroadcastRecipientPreviewResponse {
  matched_count: number;
  excluded_count: number;
  final_count: number;
  exclusion_counts?: Record<string, number>;
  excluded_sample?: EmailBroadcastExcludedPlayerSample[];
  final_sample?: EmailBroadcastFinalPlayerSample[];
}

/** GET /email/broadcasts/players/search/?q= result item. */
export interface EmailBroadcastPlayerSearchResult {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  email_marketing_opt_in: boolean;
  exclusion_reason: string | null;
}

export interface EmailBroadcastPlayerSearchResponse {
  results: EmailBroadcastPlayerSearchResult[];
}
