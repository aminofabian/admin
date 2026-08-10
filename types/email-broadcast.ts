/**
 * Marketing email broadcasts / scheduled campaigns.
 *
 * Audience filter fields (intersect with audience / user_ids):
 * - ssn_verified: true/false → player is_identity_verified
 * - deposit_min / deposit_max: lifetime completed deposits ≥ / ≤
 * - states: case-insensitive match on player.state (e.g. ["California","Texas"])
 */

export type EmailBroadcastAudience = 'all' | 'whitelabel' | 'selected';

export type EmailBroadcastStatus =
  | 'queued'
  | 'scheduled'
  | 'sending'
  | 'completed'
  | 'failed';

/** SSN filter: omit / null = any players */
export type EmailBroadcastSsnVerified = boolean | null;

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

export interface EmailBroadcast extends EmailBroadcastAudienceCriteria {
  id: number;
  subject: string;
  html_body: string;
  audience: EmailBroadcastAudience | string;
  /** Nested filters returned by list API (preferred over flat fields when present) */
  audience_filters?: EmailBroadcastAudienceCriteria | null;
  selected_user_ids: number[];
  project_id?: number | null;
  template_id?: number | null;
  scheduled_at: string | null;
  sent_at: string | null;
  status: EmailBroadcastStatus | string;
  total_recipients: number;
  successful_deliveries: number;
  failed_deliveries: number;
  skipped_deliveries: number;
  last_error: string;
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
  subject: string;
  html_body: string;
  audience: EmailBroadcastAudience;
  whitelabel_admin_uuid?: string;
  user_ids?: number[];
  scheduled_at?: string;
  /** Optional saved campaign template used to compose this send */
  template_id?: number;
  /** Forward-compatible filter builder rows (Phase 3+) */
  filters?: unknown[];
  match_mode?: 'all' | 'any';
}

export interface CreateEmailBroadcastResponse {
  success: boolean;
  message: string;
  task_id?: string;
  broadcast: EmailBroadcast;
}
