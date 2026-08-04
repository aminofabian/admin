import { apiClient } from './client';
import type {
  EmailTemplate,
  EmailTemplateDetailResponse,
  EmailTemplatesListResponse,
  UpdateEmailTemplateRequest,
  UpdateEmailTemplateResponse,
} from '@/types';

type EmailTemplateEnvelope =
  | EmailTemplate[]
  | EmailTemplatesListResponse
  | {
      status?: string;
      data?: EmailTemplate | EmailTemplate[] | { results?: EmailTemplate[] };
      results?: EmailTemplate[];
      template?: EmailTemplate;
    };

function isEmailTemplate(value: unknown): value is EmailTemplate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EmailTemplate>;
  return (
    typeof candidate.action === 'string' &&
    typeof candidate.subject === 'string' &&
    typeof candidate.body_message === 'string'
  );
}

export function extractEmailTemplates(response: EmailTemplateEnvelope | null | undefined): EmailTemplate[] {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response.filter(isEmailTemplate);
  }

  if (isEmailTemplate((response as { template?: unknown }).template)) {
    return [(response as { template: EmailTemplate }).template];
  }

  const data = (response as { data?: unknown }).data;

  if (Array.isArray(data)) {
    return data.filter(isEmailTemplate);
  }

  if (isEmailTemplate(data)) {
    return [data];
  }

  const dataResults = data && typeof data === 'object' ? (data as { results?: unknown }).results : null;
  const results = Array.isArray(dataResults)
    ? dataResults
    : Array.isArray(response.results)
      ? response.results
      : null;

  return results ? results.filter(isEmailTemplate) : [];
}

function scopeParams(whitelabelAdminUuid?: string) {
  return whitelabelAdminUuid ? { whitelabel_admin_uuid: whitelabelAdminUuid } : undefined;
}

export const emailTemplatesApi = {
  list: async (whitelabelAdminUuid?: string) => {
    const response = await apiClient.get<EmailTemplateEnvelope>('api/admin/email-templates', {
      params: scopeParams(whitelabelAdminUuid),
    });
    return extractEmailTemplates(response);
  },

  get: async (action: string, whitelabelAdminUuid?: string) => {
    const response = await apiClient.get<EmailTemplateDetailResponse | EmailTemplateEnvelope>(
      `api/admin/email-templates/${action}/`,
      { params: scopeParams(whitelabelAdminUuid) },
    );
    if (response && typeof response === 'object' && 'template' in response && isEmailTemplate(response.template)) {
      return response.template;
    }
    const rows = extractEmailTemplates(response as EmailTemplateEnvelope);
    return rows[0] ?? null;
  },

  update: async (action: string, data: UpdateEmailTemplateRequest) => {
    const response = await apiClient.patch<UpdateEmailTemplateResponse | EmailTemplate>(
      `api/admin/email-templates/${action}/`,
      data,
    );
    if (response && typeof response === 'object' && 'template' in response && isEmailTemplate(response.template)) {
      return response.template;
    }
    if (isEmailTemplate(response)) return response;
    throw new Error('Unexpected update response for email template');
  },
};
