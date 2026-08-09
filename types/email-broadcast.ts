/**
 * Marketing email broadcasts / scheduled campaigns.
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
  deposit_amount_min?: number | null;
  deposit_amount_max?: number | null;
  /** true = verified, false = unverified, null/undefined = any */
  ssn_verified?: EmailBroadcastSsnVerified;
  /** US state codes, e.g. ["CA", "NY"] */
  states?: string[];
}

export interface EmailBroadcast extends EmailBroadcastAudienceCriteria {
  id: number;
  subject: string;
  html_body: string;
  audience: EmailBroadcastAudience | string;
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
}

export interface CreateEmailBroadcastResponse {
  success: boolean;
  message: string;
  task_id?: string;
  broadcast: EmailBroadcast;
}
