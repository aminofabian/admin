export type MetaCapiEventStatus =
  | 'skipped'
  | 'queued'
  | 'sending'
  | 'retrying'
  | 'sent'
  | 'failed';

export type MetaCapiEventName = 'CompleteRegistration' | 'Purchase' | (string & {});

export interface MetaCapiEvent {
  id: number;
  event_name: MetaCapiEventName;
  event_id: string;
  event_time: string | null;
  status: MetaCapiEventStatus | string;
  status_reason: string | null;
  pixel_id: string | null;
  user_id: number | null;
  username: string | null;
  user_email: string | null;
  project_id: number | null;
  project_uuid: string | null;
  project_name: string | null;
  source_transaction_id: string | null;
  value: number | string | null;
  currency: string | null;
  attempt_count: number | null;
  http_status: number | null;
  celery_task_id: string | null;
  last_attempt_at: string | null;
  sent_at: string | null;
  request_payload?: Record<string, unknown> | null;
  response_body?: Record<string, unknown> | null;
  created: string | null;
  modified: string | null;
}

export interface MetaCapiEventSummary {
  total: number;
  by_status: Record<string, number>;
  by_event_name: Record<string, number>;
}

export interface MetaCapiEventFilters {
  event_name?: string;
  status?: string;
  username?: string;
  user_id?: string | number;
  event_id?: string;
  source_transaction_id?: string;
  pixel_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}
