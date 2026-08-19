import { apiClient } from './client';
import type {
  CancelEmailBroadcastResponse,
  CreateEmailBroadcastRequest,
  CreateEmailBroadcastResponse,
  EmailBroadcast,
  EmailBroadcastPlayerSearchResponse,
  EmailBroadcastPreviewRequest,
  EmailBroadcastRecipientPreviewResponse,
  EmailBroadcastsListResponse,
  RetryEmailBroadcastResponse,
} from '@/types';

type EmailBroadcastEnvelope =
  | EmailBroadcast[]
  | EmailBroadcastsListResponse
  | {
      status?: string;
      data?: EmailBroadcast | EmailBroadcast[] | { results?: EmailBroadcast[]; broadcast?: EmailBroadcast };
      results?: EmailBroadcast[];
      broadcast?: EmailBroadcast;
    };

function coerceId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function coerceCount(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function coerceLastError(value: unknown): string | undefined {
  if (value == null || value === false) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(coerceLastError).filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join('\n') : undefined;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'detail', 'error', 'last_error']) {
      const inner = coerceLastError(record[key]);
      if (inner) return inner;
    }
  }
  return undefined;
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string' && entry.trim()) out[key] = entry;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function countRecord(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const n = coerceCount(entry);
    if (n != null) out[key] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const keys = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return keys.length > 0 ? keys : undefined;
}

function pickCount(record: Record<string, unknown>, key: string): number | undefined {
  const direct = coerceCount(record[key]);
  if (direct != null) return direct;
  const stats = record.stats;
  if (stats && typeof stats === 'object' && !Array.isArray(stats)) {
    return coerceCount((stats as Record<string, unknown>)[key]);
  }
  return undefined;
}

function looksLikeBroadcast(record: Record<string, unknown>): boolean {
  if (coerceId(record.id) == null) return false;
  return (
    typeof record.subject === 'string' ||
    typeof record.name === 'string' ||
    typeof record.html_body === 'string'
  );
}

/** GET /users/email/broadcasts/{id}/ (and list rows) — the broadcast object is the contract. */
function unwrapBroadcastObject(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 4) return null;
  const record = value as Record<string, unknown>;
  if (looksLikeBroadcast(record)) return record;
  for (const key of ['broadcast', 'data']) {
    const nested = unwrapBroadcastObject(record[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

/** Normalize a GET detail/list row onto the broadcast object contract. */
export function normalizeEmailBroadcast(value: unknown): EmailBroadcast | null {
  const raw = unwrapBroadcastObject(value);
  if (!raw) return null;
  const id = coerceId(raw.id);
  if (id == null) return null;

  const subject =
    typeof raw.subject === 'string'
      ? raw.subject
      : typeof raw.name === 'string'
        ? raw.name
        : '';

  const lastError = coerceLastError(raw.last_error);
  const matchedCount = pickCount(raw, 'matched_count');
  const excludedCount = pickCount(raw, 'excluded_count');
  const totalRecipients = pickCount(raw, 'total_recipients');
  const exclusionSummary = countRecord(raw.exclusion_summary) || countRecord(raw.exclusion_counts);
  const exclusionLabels = stringRecord(raw.exclusion_labels);
  const successfulDeliveries = pickCount(raw, 'successful_deliveries');
  const failedDeliveries = pickCount(raw, 'failed_deliveries');
  const skippedDeliveries = pickCount(raw, 'skipped_deliveries');
  const bouncedDeliveries = pickCount(raw, 'bounced_deliveries');
  const complaintDeliveries = pickCount(raw, 'complaint_deliveries');
  const allowedVariables = stringList(raw.allowed_variables);

  const broadcast: EmailBroadcast = {
    ...(raw as unknown as EmailBroadcast),
    id,
    subject,
    html_body: typeof raw.html_body === 'string' ? raw.html_body : '',
    audience: typeof raw.audience === 'string' ? raw.audience : 'all_eligible',
    scheduled_at: typeof raw.scheduled_at === 'string' ? raw.scheduled_at : null,
    sent_at: typeof raw.sent_at === 'string' ? raw.sent_at : null,
    status: typeof raw.status === 'string' ? raw.status : 'draft',
  };

  if (matchedCount != null) broadcast.matched_count = matchedCount;
  if (excludedCount != null) broadcast.excluded_count = excludedCount;
  if (totalRecipients != null) broadcast.total_recipients = totalRecipients;
  if (exclusionSummary) broadcast.exclusion_summary = exclusionSummary;
  if (exclusionLabels) broadcast.exclusion_labels = exclusionLabels;
  if (successfulDeliveries != null) broadcast.successful_deliveries = successfulDeliveries;
  if (failedDeliveries != null) broadcast.failed_deliveries = failedDeliveries;
  if (skippedDeliveries != null) broadcast.skipped_deliveries = skippedDeliveries;
  if (bouncedDeliveries != null) broadcast.bounced_deliveries = bouncedDeliveries;
  if (complaintDeliveries != null) broadcast.complaint_deliveries = complaintDeliveries;
  if (lastError != null) broadcast.last_error = lastError;
  if (allowedVariables) broadcast.allowed_variables = allowedVariables;

  return broadcast;
}

export function extractEmailBroadcasts(response: EmailBroadcastEnvelope | null | undefined): EmailBroadcast[] {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response.map(normalizeEmailBroadcast).filter((row): row is EmailBroadcast => row != null);
  }

  const direct = normalizeEmailBroadcast(response);
  if (direct) return [direct];

  const record = response as { broadcast?: unknown; data?: unknown; results?: unknown };
  const nestedBroadcast = normalizeEmailBroadcast(record.broadcast);
  if (nestedBroadcast) return [nestedBroadcast];

  const data = record.data;
  if (Array.isArray(data)) {
    return data.map(normalizeEmailBroadcast).filter((row): row is EmailBroadcast => row != null);
  }

  const fromData = normalizeEmailBroadcast(data);
  if (fromData) return [fromData];

  const dataResults =
    data && typeof data === 'object' ? (data as { results?: unknown }).results : null;
  const results = Array.isArray(dataResults)
    ? dataResults
    : Array.isArray(record.results)
      ? record.results
      : null;

  return results
    ? results.map(normalizeEmailBroadcast).filter((row): row is EmailBroadcast => row != null)
    : [];
}

function scopeParams(whitelabelAdminUuid?: string) {
  return whitelabelAdminUuid ? { whitelabel_admin_uuid: whitelabelAdminUuid } : undefined;
}

function unwrapBroadcastAction<T extends { success: boolean; message: string; broadcast: EmailBroadcast }>(
  response: unknown,
  fallbackMessage: string,
  extras?: Omit<Partial<T>, 'success' | 'message' | 'broadcast'>,
): T {
  if (response && typeof response === 'object' && 'broadcast' in response) {
    const broadcast = normalizeEmailBroadcast((response as { broadcast?: unknown }).broadcast);
    if (broadcast) {
      return { ...(response as object), broadcast } as T;
    }
  }
  const broadcast = normalizeEmailBroadcast(response);
  if (broadcast) {
    return {
      success: true,
      message: fallbackMessage,
      broadcast,
      ...extras,
    } as T;
  }
  throw new Error('Unexpected response for email broadcast');
}

export const emailBroadcastsApi = {
  list: async (whitelabelAdminUuid?: string, status?: string) => {
    const response = await apiClient.get<EmailBroadcastEnvelope>('api/admin/email-broadcasts', {
      params: {
        ...scopeParams(whitelabelAdminUuid),
        ...(status ? { status } : {}),
      },
    });
    return extractEmailBroadcasts(response);
  },

  create: async (data: CreateEmailBroadcastRequest) => {
    const response = await apiClient.post<CreateEmailBroadcastResponse | EmailBroadcast>(
      'api/admin/email-broadcasts',
      data,
    );
    if (response && typeof response === 'object' && 'broadcast' in response) {
      const broadcast = normalizeEmailBroadcast(response.broadcast);
      if (broadcast) {
        return { ...(response as CreateEmailBroadcastResponse), broadcast };
      }
    }
    const created = normalizeEmailBroadcast(response);
    if (created) {
      return {
        success: true,
        message: 'Marketing email broadcast queued.',
        broadcast: created,
      } satisfies CreateEmailBroadcastResponse;
    }
    throw new Error('Unexpected create response for email broadcast');
  },

  /** Load a single campaign / reopen a draft. */
  get: async (id: number) => {
    const response = await apiClient.get<EmailBroadcastEnvelope>(`api/admin/email-broadcasts/${id}/`);
    return extractEmailBroadcasts(response)[0] || null;
  },

  /** Update a draft only (PATCH /email/broadcasts/<id>/). */
  update: async (id: number, data: CreateEmailBroadcastRequest) => {
    const response = await apiClient.patch<CreateEmailBroadcastResponse | EmailBroadcast>(
      `api/admin/email-broadcasts/${id}/`,
      data,
    );
    if (response && typeof response === 'object' && 'broadcast' in response) {
      const broadcast = normalizeEmailBroadcast(response.broadcast);
      if (broadcast) {
        return { ...(response as CreateEmailBroadcastResponse), broadcast };
      }
    }
    const updated = normalizeEmailBroadcast(response);
    if (updated) {
      return {
        success: true,
        message: 'Draft updated.',
        broadcast: updated,
      } satisfies CreateEmailBroadcastResponse;
    }
    throw new Error('Unexpected update response for email broadcast');
  },

  /** Queue a saved draft only (POST /email/broadcasts/<id>/send/). Use retryFailed for failed recipients. */
  send: async (id: number) => {
    const response = await apiClient.post<CreateEmailBroadcastResponse | EmailBroadcast>(
      `api/admin/email-broadcasts/${id}/send`,
    );
    return unwrapBroadcastAction<CreateEmailBroadcastResponse>(response, 'Campaign queued.');
  },

  /** Stop a draft / queued / scheduled / sending campaign (POST /email/broadcasts/<id>/cancel/). */
  cancel: async (id: number) => {
    const response = await apiClient.post<CancelEmailBroadcastResponse | EmailBroadcast>(
      `api/admin/email-broadcasts/${id}/cancel`,
    );
    return unwrapBroadcastAction<CancelEmailBroadcastResponse>(response, 'Campaign cancelled.', {
      skipped_queued: 0,
    });
  },

  /**
   * Re-queue failed recipients only (POST /email/broadcasts/<id>/retry/).
   * Already-sent and skipped recipients are left untouched.
   */
  retryFailed: async (id: number) => {
    const response = await apiClient.post<RetryEmailBroadcastResponse | EmailBroadcast>(
      `api/admin/email-broadcasts/${id}/retry`,
    );
    return unwrapBroadcastAction<RetryEmailBroadcastResponse>(response, 'Retry queued.', {
      retried: 0,
    });
  },

  /** Live recipient counts for the current targeting (POST /email/broadcasts/preview/). */
  preview: async (data: EmailBroadcastPreviewRequest) => {
    return apiClient.post<EmailBroadcastRecipientPreviewResponse>(
      'api/admin/email-broadcasts/preview',
      data,
    );
  },

  /** Search players by username or email (GET /email/broadcasts/players/search/?q=). */
  searchPlayers: async (query: string) => {
    return apiClient.get<EmailBroadcastPlayerSearchResponse>(
      'api/admin/email-broadcasts/players/search',
      { params: { q: query, limit: 20 } },
    );
  },
};
