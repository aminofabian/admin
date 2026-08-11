import type { EmailCampaignComposerDraft, EmailCampaignRecipientMethod } from '@/types';

export const EMAIL_CAMPAIGN_RECIPIENT_METHODS: {
  value: EmailCampaignRecipientMethod;
  label: string;
  description: string;
}[] = [
  {
    value: 'specific',
    label: 'Specific Players',
    description: 'Pick players by name or email',
  },
  {
    value: 'filtered',
    label: 'Filtered Players',
    description: 'Audience from filter conditions',
  },
  {
    value: 'all_eligible',
    label: 'All Eligible Players',
    description: 'Everyone eligible in this brand',
  },
];

export const EMAIL_CAMPAIGN_COMPOSER_SEED_KEY = 'email-campaign-composer-seed';

export function createEmptyEmailCampaignDraft(): EmailCampaignComposerDraft {
  return {
    internal_name: '',
    subject: '',
    html_body: '<p>Hi {{ username }},</p>',
    recipient_method: 'specific',
    selected_players: [],
    match_mode: 'all',
    filter_rows: [],
    broadcast_id: null,
    template_id: null,
  };
}

export function draftStorageKey(scopeKey: string): string {
  return `email-campaign-composer-draft:${scopeKey || 'default'}`;
}
