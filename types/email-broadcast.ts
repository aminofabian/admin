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

export interface EmailBroadcast {
  id: number;
  subject: string;
  html_body: string;
  audience: EmailBroadcastAudience | string;
  selected_user_ids: number[];
  project_id?: number | null;
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

export interface CreateEmailBroadcastRequest {
  subject: string;
  html_body: string;
  audience: EmailBroadcastAudience;
  whitelabel_admin_uuid?: string;
  user_ids?: number[];
  scheduled_at?: string;
}

export interface CreateEmailBroadcastResponse {
  success: boolean;
  message: string;
  task_id?: string;
  broadcast: EmailBroadcast;
}
