import {
  createFilterRow,
  getFilterFieldDef,
} from '@/lib/constants/email-campaign-filters';
import type {
  CreateEmailBroadcastRequest,
  EmailBroadcastFilterPayload,
  EmailCampaignComposerDraft,
  EmailCampaignFilterOperator,
  EmailCampaignFilterRow,
  EmailCampaignMatchMode,
} from '@/types';

const LEGACY_OPERATOR_MAP: Record<string, EmailCampaignFilterOperator> = {
  is: 'eq',
  is_not: 'eq',
  equal_to: 'eq',
  greater_than: 'gt',
  less_than: 'lt',
  between: 'between',
  before: 'before',
  after: 'after',
  last_x_days: 'last_x_days',
  never: 'never',
};

/** Map a wire/legacy operator string onto the current operator set. */
export function normalizeFilterOperator(operator: string | undefined): EmailCampaignFilterOperator {
  return LEGACY_OPERATOR_MAP[operator || ''] || 'eq';
}

/**
 * Normalize draft filter rows into the current field/operator set.
 * Legacy rows (is/gt/…, ssn_verified, state) are upgraded or dropped when the
 * new backend has no equivalent filter.
 */
export function migrateLegacyFiltersToRows(
  draft: Partial<EmailCampaignComposerDraft>,
): EmailCampaignFilterRow[] {
  const rawRows = Array.isArray(draft.filter_rows) ? draft.filter_rows : [];
  const rows: EmailCampaignFilterRow[] = [];

  for (const row of rawRows) {
    if (!row || typeof row !== 'object') continue;
    const def = getFilterFieldDef(row.field);
    if (!def) continue; // ssn_verified / state have no new backend equivalent.

    const operator = normalizeFilterOperator(row.operator);
    const value =
      row.field === 'kyc_status' && row.value === 'approved' ? 'verified' : row.value;
    rows.push({
      id: typeof row.id === 'string' ? row.id : `filter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      field: def.field,
      operator,
      value: typeof value === 'string' ? value : '',
      value_to: typeof row.value_to === 'string' ? row.value_to : '',
    });
  }

  // Legacy flat criteria (older drafts / reused broadcasts).
  if (rows.length === 0) {
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
        operator: 'gt',
        value: min,
      });
    } else if (max) {
      rows.push({
        ...createFilterRow('total_purchase_amount'),
        operator: 'lt',
        value: max,
      });
    }
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

    if (!row.value.trim()) {
      errors.push(`Filter ${n} (${label}): value is required.`);
    }
  });

  return errors;
}

function rowToPayloadValue(row: EmailCampaignFilterRow): EmailBroadcastFilterPayload['value'] {
  if (row.operator === 'never') return null;

  const def = getFilterFieldDef(row.field);
  const numeric =
    def?.valueType === 'number' || row.operator === 'last_x_days';

  if (row.operator === 'between') {
    const from = row.value.trim();
    const to = (row.value_to || '').trim();
    if (numeric) {
      const fromNum = Number(from);
      const toNum = Number(to);
      return [fromNum, toNum];
    }
    return [from, to];
  }

  const single = row.value.trim();
  return numeric ? Number(single) : single;
}

/** Map filter rows to the new backend wire format: filters + filter_match. */
export function mapFilterRowsToBroadcastPayload(
  rows: EmailCampaignFilterRow[],
  matchMode: EmailCampaignMatchMode,
): Pick<CreateEmailBroadcastRequest, 'filters' | 'filter_match'> {
  const filters: EmailBroadcastFilterPayload[] = rows
    .filter((row) => {
      if (row.operator === 'never') return true;
      if (row.operator === 'between') {
        return Boolean(row.value.trim() && (row.value_to || '').trim());
      }
      return Boolean(row.value.trim());
    })
    .map((row) => ({
      field: row.field,
      op: row.operator,
      value: rowToPayloadValue(row),
    }));

  return { filters, filter_match: matchMode };
}

export function summarizeFilterRows(rows: EmailCampaignFilterRow[]): string {
  if (rows.length === 0) return 'No filters';
  return rows
    .map((row) => {
      const label = getFilterFieldDef(row.field)?.label || row.field;
      if (row.operator === 'never') return `${label}: never`;
      if (row.operator === 'between') {
        return `${label} ${row.value}–${row.value_to || ''}`;
      }
      return `${label} ${row.operator.replace(/_/g, ' ')} ${row.value}`;
    })
    .join(' · ');
}
