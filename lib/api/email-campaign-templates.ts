import { apiClient } from './client';
import type {
  CreateEmailCampaignTemplateRequest,
  CreateEmailCampaignTemplateResponse,
  EmailCampaignTemplate,
  EmailCampaignTemplatesListResponse,
  UpdateEmailCampaignTemplateRequest,
} from '@/types';

type EmailCampaignTemplateEnvelope =
  | EmailCampaignTemplate[]
  | EmailCampaignTemplatesListResponse
  | {
      status?: string;
      data?:
        | EmailCampaignTemplate
        | EmailCampaignTemplate[]
        | { results?: EmailCampaignTemplate[] };
      results?: EmailCampaignTemplate[];
      template?: EmailCampaignTemplate;
    };

function isEmailCampaignTemplate(value: unknown): value is EmailCampaignTemplate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EmailCampaignTemplate>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.name === 'string' &&
    typeof candidate.subject === 'string' &&
    typeof candidate.html_body === 'string'
  );
}

export function extractEmailCampaignTemplates(
  response: EmailCampaignTemplateEnvelope | null | undefined,
): EmailCampaignTemplate[] {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response.filter(isEmailCampaignTemplate);
  }

  if (isEmailCampaignTemplate((response as { template?: unknown }).template)) {
    return [(response as { template: EmailCampaignTemplate }).template];
  }

  const data = (response as { data?: unknown }).data;

  if (Array.isArray(data)) {
    return data.filter(isEmailCampaignTemplate);
  }

  if (isEmailCampaignTemplate(data)) {
    return [data];
  }

  const dataResults = data && typeof data === 'object' ? (data as { results?: unknown }).results : null;
  const results = Array.isArray(dataResults)
    ? dataResults
    : Array.isArray(response.results)
      ? response.results
      : null;

  return results ? results.filter(isEmailCampaignTemplate) : [];
}

function scopeParams(whitelabelAdminUuid?: string) {
  return whitelabelAdminUuid ? { whitelabel_admin_uuid: whitelabelAdminUuid } : undefined;
}

export const emailCampaignTemplatesApi = {
  list: async (whitelabelAdminUuid?: string) => {
    const response = await apiClient.get<EmailCampaignTemplateEnvelope>(
      'api/admin/email-campaign-templates',
      { params: scopeParams(whitelabelAdminUuid) },
    );
    return extractEmailCampaignTemplates(response);
  },

  create: async (data: CreateEmailCampaignTemplateRequest) => {
    const response = await apiClient.post<
      CreateEmailCampaignTemplateResponse | EmailCampaignTemplate
    >('api/admin/email-campaign-templates', data);

    if (
      response &&
      typeof response === 'object' &&
      'template' in response &&
      isEmailCampaignTemplate(response.template)
    ) {
      return response.template;
    }
    if (isEmailCampaignTemplate(response)) return response;
    throw new Error('Unexpected create response for campaign template');
  },

  update: async (id: number, data: UpdateEmailCampaignTemplateRequest) => {
    const response = await apiClient.patch<
      CreateEmailCampaignTemplateResponse | EmailCampaignTemplate
    >(`api/admin/email-campaign-templates/${id}/`, data);

    if (
      response &&
      typeof response === 'object' &&
      'template' in response &&
      isEmailCampaignTemplate(response.template)
    ) {
      return response.template;
    }
    if (isEmailCampaignTemplate(response)) return response;
    throw new Error('Unexpected update response for campaign template');
  },

  remove: async (id: number, whitelabelAdminUuid?: string) => {
    await apiClient.delete(`api/admin/email-campaign-templates/${id}/`, {
      params: scopeParams(whitelabelAdminUuid),
    });
  },
};
