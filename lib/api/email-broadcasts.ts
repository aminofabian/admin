import { apiClient } from './client';
import type {
  CreateEmailBroadcastRequest,
  CreateEmailBroadcastResponse,
  EmailBroadcast,
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
  list: async (whitelabelAdminUuid?: string) => {
    const response = await apiClient.get<EmailBroadcastEnvelope>('api/admin/email-broadcasts', {
      params: scopeParams(whitelabelAdminUuid),
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
};
