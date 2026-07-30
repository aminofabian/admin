'use client';

import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/formatters';
import type { MetaCapiEvent } from '@/types/meta-capi-event';
import {
  DetailsCard,
  DetailsField,
  DetailsModalWrapper,
  DetailsRow,
} from './details-modal-wrapper';

function statusVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const s = status.toLowerCase();
  if (s === 'sent') return 'success';
  if (s === 'failed') return 'danger';
  if (s === 'queued' || s === 'sending' || s === 'retrying') return 'warning';
  if (s === 'skipped') return 'default';
  return 'info';
}

function formatValue(value: MetaCapiEvent['value'], currency: string | null): string {
  if (value == null || value === '') return '—';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(num)) return String(value);
  const cur = currency?.trim() || 'USD';
  return `${cur} ${num.toFixed(2)}`;
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  if (data == null) return null;
  let text: string;
  try {
    text = JSON.stringify(data, null, 2);
  } catch {
    text = String(data);
  }
  if (!text || text === '{}' || text === 'null') return null;

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
        {text}
      </pre>
    </div>
  );
}

interface MetaCapiEventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: MetaCapiEvent | null;
  isLoading?: boolean;
}

export function MetaCapiEventDetailsModal({
  isOpen,
  onClose,
  event,
  isLoading = false,
}: MetaCapiEventDetailsModalProps) {
  return (
    <DetailsModalWrapper isOpen={isOpen} onClose={onClose} title="Meta CAPI Event">
      {isLoading && !event ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading event…</div>
      ) : !event ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Event not found</div>
      ) : (
        <DetailsCard id={String(event.id)}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{event.event_name}</span>
              <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
            </div>

            <DetailsRow>
              <DetailsField label="Event ID" value={event.event_id || '—'} />
              <DetailsField
                label="Event time"
                value={event.event_time ? formatDate(event.event_time) : '—'}
              />
            </DetailsRow>

            <DetailsRow>
              <DetailsField
                label="Player"
                value={
                  event.username
                    ? `${event.username}${event.user_id != null ? ` (#${event.user_id})` : ''}`
                    : event.user_id != null
                      ? `#${event.user_id}`
                      : '—'
                }
              />
              <DetailsField label="Email" value={event.user_email || '—'} />
            </DetailsRow>

            <DetailsRow>
              <DetailsField label="Pixel ID" value={event.pixel_id || '—'} />
              <DetailsField
                label="Source transaction"
                value={event.source_transaction_id || '—'}
              />
            </DetailsRow>

            <DetailsRow>
              <DetailsField
                label="Value"
                value={formatValue(event.value, event.currency)}
              />
              <DetailsField
                label="HTTP status"
                value={event.http_status != null ? String(event.http_status) : '—'}
              />
            </DetailsRow>

            <DetailsRow>
              <DetailsField
                label="Attempts"
                value={event.attempt_count != null ? String(event.attempt_count) : '—'}
              />
              <DetailsField
                label="Sent at"
                value={event.sent_at ? formatDate(event.sent_at) : '—'}
              />
            </DetailsRow>

            <DetailsRow>
              <DetailsField
                label="Last attempt"
                value={event.last_attempt_at ? formatDate(event.last_attempt_at) : '—'}
              />
              <DetailsField
                label="Created"
                value={event.created ? formatDate(event.created) : '—'}
              />
            </DetailsRow>

            {(event.project_name || event.project_id != null) && (
              <DetailsRow>
                <DetailsField
                  label="Project"
                  value={
                    event.project_name
                      ? `${event.project_name}${event.project_id != null ? ` (#${event.project_id})` : ''}`
                      : `#${event.project_id}`
                  }
                />
                <DetailsField label="Project UUID" value={event.project_uuid || '—'} />
              </DetailsRow>
            )}

            {event.status_reason ? (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">Status reason</div>
                <div className="text-xs font-medium text-foreground whitespace-pre-wrap">
                  {event.status_reason}
                </div>
              </div>
            ) : null}

            {event.celery_task_id ? (
              <DetailsField label="Celery task" value={event.celery_task_id} />
            ) : null}

            <JsonBlock label="Request payload" data={event.request_payload} />
            <JsonBlock label="Response body" data={event.response_body} />
          </div>
        </DetailsCard>
      )}
    </DetailsModalWrapper>
  );
}
