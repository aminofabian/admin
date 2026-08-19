/**
 * Reusable marketing email templates for campaigns / broadcasts.
 * Distinct from transactional event templates under /email/templates/.
 */

export interface EmailCampaignTemplate {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  created?: string;
  modified?: string;
}

export interface EmailCampaignTemplatesListResponse {
  results: EmailCampaignTemplate[];
}

export interface CreateEmailCampaignTemplateRequest {
  name: string;
  subject: string;
  html_body: string;
  whitelabel_admin_uuid?: string;
}

export interface UpdateEmailCampaignTemplateRequest {
  name?: string;
  subject?: string;
  html_body?: string;
  whitelabel_admin_uuid?: string;
}

export interface CreateEmailCampaignTemplateResponse {
  success?: boolean;
  message?: string;
  template: EmailCampaignTemplate;
}
