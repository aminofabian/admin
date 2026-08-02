import { apiClient } from './client';
import type {
  CreateEmailTemplateRequest,
  EmailTemplate,
  UpdateEmailTemplateRequest,
} from '@/types';

type EmailTemplateEnvelope =
  | EmailTemplate[]
  | {
      status?: string;
      data?: EmailTemplate | EmailTemplate[] | { results?: EmailTemplate[] };
      results?: EmailTemplate[];
    };

function isEmailTemplate(value: unknown): value is EmailTemplate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EmailTemplate>;
  return (
    typeof candidate.template_type === 'string' &&
    typeof candidate.subject === 'string' &&
    typeof candidate.body === 'string'
  );
}

export function extractEmailTemplates(response: EmailTemplateEnvelope | null | undefined): EmailTemplate[] {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response.filter(isEmailTemplate);
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

export const emailTemplatesApi = {
  list: async () => {
    const response = await apiClient.get<EmailTemplateEnvelope>('api/admin/email-templates');
    return extractEmailTemplates(response);
  },

  create: (data: CreateEmailTemplateRequest) =>
    apiClient.post<EmailTemplate>('api/admin/email-templates', data),

  update: (id: number, data: UpdateEmailTemplateRequest) =>
    apiClient.patch<EmailTemplate>(`api/admin/email-templates/${id}/`, data),
};
