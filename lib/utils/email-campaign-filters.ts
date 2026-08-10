import { US_STATES } from '@/components/dashboard/players/players-filters';
import {
  createFilterRow,
  getFilterFieldDef,
} from '@/lib/constants/email-campaign-filters';
import type {
  CreateEmailBroadcastRequest,
  EmailCampaignComposerDraft,
  EmailCampaignFilterRow,
  EmailCampaignMatchMode,
} from '@/types';

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function migrateLegacyFiltersToRows(
  draft: Partial<EmailCampaignComposerDraft>,
): EmailCampaignFilterRow[] {
  if (Array.isArray(draft.filter_rows) && draft.filter_rows.length > 0) {
    return draft.filter_rows;
  }

  const rows: EmailCampaignFilterRow[] = [];
  const min = draft.deposit_min?.trim();
  const max = draft.deposit_max?.trim();

  if (min && max) {
    rows.push({
      ...createFilterRow('total_purchase_amount'),
      operator: 'between',
      value: min,
      value_to: max,
    });
  } else if (min) {
    rows.push({
      ...createFilterRow('total_purchase_amount'),
      operator: 'greater_than',
      value: min,
    });
  } else if (max) {
    rows.push({
      ...createFilterRow('total_purchase_amount'),
      operator: 'less_than',
      value: max,
    });
  }

  if (draft.ssn_filter === 'verified' || draft.ssn_filter === 'unverified') {
    rows.push({
      ...createFilterRow('ssn_verified'),
      operator: 'is',
      value: draft.ssn_filter === 'verified' ? 'true' : 'false',
    });
  }

  if (Array.isArray(draft.states) && draft.states.length > 0) {
    rows.push({
      ...createFilterRow('state'),
      operator: 'in',
      value: draft.states.join(','),
    });
  }

  return rows;
}

export function validateFilterRows(rows: EmailCampaignFilterRow[]): string[] {
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const label = getFilterFieldDef(row.field)?.label || row.field;
    const n = index + 1;

    if (row.operator === 'never') return;

    if (row.operator === 'between') {
      if (!row.value.trim() || !(row.value_to || '').trim()) {
        errors.push(`Filter ${n} (${label}): both values are required for Between.`);
      }
      return;
    }

    if (row.operator === 'in') {
      if (!row.value.trim()) {
        errors.push(`Filter ${n} (${label}): select at least one state.`);
      }
      return;
    }

    if (!row.value.trim()) {
      errors.push(`Filter ${n} (${label}): value is required.`);
    }
  });

  return errors;
}

export function mapFilterRowsToBroadcastCriteria(
  rows: EmailCampaignFilterRow[],
  matchMode: EmailCampaignMatchMode,
): Pick<
  CreateEmailBroadcastRequest,
  'deposit_min' | 'deposit_max' | 'ssn_verified' | 'states'
> & { filters?: EmailCampaignFilterRow[]; match_mode?: EmailCampaignMatchMode } {
  const criteria: Pick<
    CreateEmailBroadcastRequest,
    'deposit_min' | 'deposit_max' | 'ssn_verified' | 'states'
  > & { filters?: EmailCampaignFilterRow[]; match_mode?: EmailCampaignMatchMode } = {};

  for (const row of rows) {
    if (row.field === 'total_purchase_amount') {
      const from = Number(row.value);
      const to = Number(row.value_to);
      if (row.operator === 'greater_than' && Number.isFinite(from)) {
        criteria.deposit_min = from;
      } else if (row.operator === 'less_than' && Number.isFinite(from)) {
        criteria.deposit_max = from;
      } else if (row.operator === 'between') {
        if (Number.isFinite(from)) criteria.deposit_min = from;
        if (Number.isFinite(to)) criteria.deposit_max = to;
      }
    }

    if (row.field === 'ssn_verified' && row.operator === 'is') {
      if (row.value === 'true') criteria.ssn_verified = true;
      if (row.value === 'false') criteria.ssn_verified = false;
    }

    if (row.field === 'state' && row.operator === 'in') {
      const codes = row.value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      criteria.states = codes
        .map((code) => US_STATES.find((state) => state.value === code)?.label || code)
        .sort((a, b) => a.localeCompare(b));
    }
  }

  // Forward-compatible payload for BE filter builder.
  if (rows.length > 0) {
    criteria.filters = rows;
    criteria.match_mode = matchMode;
  }

  return criteria;
}

export function mapFilterRowsToPlayerListParams(
  rows: EmailCampaignFilterRow[],
): { params: Record<string, string | number | boolean>; unsupported: string[] } {
  const params: Record<string, string | number | boolean> = { page: 1, page_size: 1 };
  const unsupported: string[] = [];

  for (const row of rows) {
    const def = getFilterFieldDef(row.field);
    if (!def?.previewSupported) {
      unsupported.push(def?.label || row.field);
      continue;
    }

    if (row.field === 'account_status' && row.operator === 'is' && row.value) {
      params.status = row.value;
      continue;
    }

    if (row.field === 'kyc_status' && row.operator === 'is' && row.value) {
      params.identity_verification_status = row.value;
      continue;
    }

    if (row.field === 'first_purchase' && row.operator === 'is') {
      if (row.value === 'completed') params.first_deposit_done = true;
      if (row.value === 'not_completed') params.first_deposit_done = false;
      continue;
    }

    if (row.field === 'state' && row.operator === 'in') {
      const codes = row.value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      // Players list currently accepts a single state; use first for preview hint.
      if (codes[0]) params.state = codes[0];
      if (codes.length > 1) unsupported.push('State (multi-select preview limited to first)');
      continue;
    }

    if (row.field === 'registration_date') {
      if (row.operator === 'before' && row.value) {
        params.date_to = row.value;
        continue;
      }
      if (row.operator === 'after' && row.value) {
        params.date_from = row.value;
        continue;
      }
      if (row.operator === 'between' && row.value && row.value_to) {
        params.date_from = row.value;
        params.date_to = row.value_to;
        continue;
      }
      if (row.operator === 'last_x_days') {
        const days = Number(row.value);
        if (Number.isFinite(days) && days > 0) {
          params.date_from = daysAgoIso(days);
          continue;
        }
      }
    }

    unsupported.push(def.label);
  }

  return { params, unsupported: Array.from(new Set(unsupported)) };
}

export function summarizeFilterRows(rows: EmailCampaignFilterRow[]): string {
  if (rows.length === 0) return 'No filters';
  return rows
    .map((row) => {
      const label = getFilterFieldDef(row.field)?.label || row.field;
      if (row.operator === 'between') return `${label} ${row.value}–${row.value_to || ''}`;
      if (row.operator === 'in') {
        const count = row.value.split(',').filter(Boolean).length;
        return `${label}: ${count} selected`;
      }
      return `${label} ${row.operator.replace(/_/g, ' ')} ${row.value}`;
    })
    .join(' · ');
}
