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
} from '@/types';

type EmailBroadcastEnvelope =
  | EmailBroadcast[]
  | EmailBroadcastsListResponse
  | {
      status?: string;
      data?: EmailBroadcast | EmailBroadcast[] | { results?: EmailBroadcast[] };
      results?: EmailBroadcast[];
      broadcast?: EmailBroadcast;
    };

function isEmailBroadcast(value: unknown): value is EmailBroadcast {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EmailBroadcast>;
  return typeof candidate.id === 'number' && typeof candidate.subject === 'string';
}

export function extractEmailBroadcasts(response: EmailBroadcastEnvelope | null | undefined): EmailBroadcast[] {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response.filter(isEmailBroadcast);
  }

  if (isEmailBroadcast((response as { broadcast?: unknown }).broadcast)) {
    return [(response as { broadcast: EmailBroadcast }).broadcast];
  }

  const data = (response as { data?: unknown }).data;

  if (Array.isArray(data)) {
    return data.filter(isEmailBroadcast);
  }

  if (isEmailBroadcast(data)) {
    return [data];
  }

  const dataResults = data && typeof data === 'object' ? (data as { results?: unknown }).results : null;
  const results = Array.isArray(dataResults)
    ? dataResults
    : Array.isArray(response.results)
      ? response.results
      : null;

  return results ? results.filter(isEmailBroadcast) : [];
}

function scopeParams(whitelabelAdminUuid?: string) {
  return whitelabelAdminUuid ? { whitelabel_admin_uuid: whitelabelAdminUuid } : undefined;
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
    if (response && typeof response === 'object' && 'broadcast' in response && isEmailBroadcast(response.broadcast)) {
      return response as CreateEmailBroadcastResponse;
    }
    if (isEmailBroadcast(response)) {
      return {
        success: true,
        message: 'Marketing email broadcast queued.',
        broadcast: response,
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
    if (response && typeof response === 'object' && 'broadcast' in response && isEmailBroadcast(response.broadcast)) {
      return response as CreateEmailBroadcastResponse;
    }
    if (isEmailBroadcast(response)) {
      return {
        success: true,
        message: 'Draft updated.',
        broadcast: response,
      } satisfies CreateEmailBroadcastResponse;
    }
    throw new Error('Unexpected update response for email broadcast');
  },

  /** Queue a saved draft for sending (POST /email/broadcasts/<id>/send/). */
  send: async (id: number) => {
    return apiClient.post<CreateEmailBroadcastResponse | EmailBroadcast>(
      `api/admin/email-broadcasts/${id}/send`,
    );
  },

  /** Stop a draft / queued / scheduled / sending campaign (POST /email/broadcasts/<id>/cancel/). */
  cancel: async (id: number) => {
    const response = await apiClient.post<CancelEmailBroadcastResponse | EmailBroadcast>(
      `api/admin/email-broadcasts/${id}/cancel`,
    );
    if (
      response &&
      typeof response === 'object' &&
      'broadcast' in response &&
      isEmailBroadcast(response.broadcast)
    ) {
      return response as CancelEmailBroadcastResponse;
    }
    if (isEmailBroadcast(response)) {
      return {
        success: true,
        message: 'Campaign cancelled.',
        skipped_queued: 0,
        broadcast: response,
      } satisfies CancelEmailBroadcastResponse;
    }
    throw new Error('Unexpected cancel response for email broadcast');
  },

  /**
   * Re-queue failed recipients only (POST /email/broadcasts/<id>/retry-failed/).
   * Already-sent recipients stay sent and are not emailed again.
   */
  retryFailed: async (id: number) => {
    return apiClient.post<CreateEmailBroadcastResponse | EmailBroadcast>(
      `api/admin/email-broadcasts/${id}/retry-failed`,
    );
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
