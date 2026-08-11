import {
  createEmptyEmailCampaignDraft,
  draftStorageKey,
  EMAIL_CAMPAIGN_COMPOSER_SEED_KEY,
} from '@/lib/constants/email-campaign-composer';
import { migrateLegacyFiltersToRows } from '@/lib/utils/email-campaign-filters';
import type {
  EmailCampaignComposerDraft,
  EmailCampaignFilterRow,
  EmailCampaignSelectedPlayer,
} from '@/types';

function isSelectedPlayer(value: unknown): value is EmailCampaignSelectedPlayer {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<EmailCampaignSelectedPlayer>;
  return (
    typeof row.id === 'number' &&
    typeof row.username === 'string' &&
    typeof row.email === 'string'
  );
}

function isFilterRow(value: unknown): value is EmailCampaignFilterRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<EmailCampaignFilterRow>;
  return (
    typeof row.id === 'string' &&
    typeof row.field === 'string' &&
    typeof row.operator === 'string' &&
    typeof row.value === 'string'
  );
}

export function normalizeComposerDraft(
  value: unknown,
): EmailCampaignComposerDraft {
  const empty = createEmptyEmailCampaignDraft();
  if (!value || typeof value !== 'object') return empty;
  const raw = value as Partial<EmailCampaignComposerDraft>;

  const method = raw.recipient_method;
  const recipient_method =
    method === 'specific' || method === 'filtered' || method === 'all_eligible'
      ? method
      : method === 'all' || method === 'whitelabel'
        ? 'all_eligible'
        : empty.recipient_method;

  const match_mode = raw.match_mode === 'any' ? 'any' : 'all';
  const filter_rows = migrateLegacyFiltersToRows({
    ...raw,
    filter_rows: Array.isArray(raw.filter_rows)
      ? raw.filter_rows.filter(isFilterRow)
      : [],
  });

  return {
    internal_name: typeof raw.internal_name === 'string' ? raw.internal_name : '',
    subject: typeof raw.subject === 'string' ? raw.subject : '',
    html_body:
      typeof raw.html_body === 'string' && raw.html_body.trim()
        ? raw.html_body
        : empty.html_body,
    recipient_method,
    selected_players: Array.isArray(raw.selected_players)
      ? raw.selected_players.filter(isSelectedPlayer)
      : [],
    match_mode,
    filter_rows,
    broadcast_id:
      typeof raw.broadcast_id === 'number'
        ? raw.broadcast_id
        : raw.broadcast_id === null
          ? null
          : empty.broadcast_id ?? null,
    template_id:
      typeof raw.template_id === 'number' || raw.template_id === null
        ? raw.template_id
        : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  };
}

export function loadComposerDraft(scopeKey: string): EmailCampaignComposerDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(scopeKey));
    if (!raw) return null;
    return normalizeComposerDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveComposerDraft(scopeKey: string, draft: EmailCampaignComposerDraft): void {
  if (typeof window === 'undefined') return;
  const payload: EmailCampaignComposerDraft = {
    ...draft,
    updated_at: new Date().toISOString(),
  };
  window.localStorage.setItem(draftStorageKey(scopeKey), JSON.stringify(payload));
}

export function clearComposerDraft(scopeKey: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(draftStorageKey(scopeKey));
}

export function writeComposerSeed(draft: EmailCampaignComposerDraft): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    EMAIL_CAMPAIGN_COMPOSER_SEED_KEY,
    JSON.stringify({ ...draft, updated_at: new Date().toISOString() }),
  );
}

export function consumeComposerSeed(): EmailCampaignComposerDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(EMAIL_CAMPAIGN_COMPOSER_SEED_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(EMAIL_CAMPAIGN_COMPOSER_SEED_KEY);
    return normalizeComposerDraft(JSON.parse(raw));
  } catch {
    window.sessionStorage.removeItem(EMAIL_CAMPAIGN_COMPOSER_SEED_KEY);
    return null;
  }
}
