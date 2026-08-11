'use client';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  ComposerFieldLabel,
} from '@/components/features/email-campaign-composer-ui';
import {
  EMAIL_CAMPAIGN_FILTER_FIELDS,
  EMAIL_CAMPAIGN_FILTER_OPERATOR_LABELS,
  createFilterRow,
  getFilterFieldDef,
} from '@/lib/constants/email-campaign-filters';
import type {
  EmailCampaignFilterField,
  EmailCampaignFilterOperator,
  EmailCampaignFilterRow,
  EmailCampaignMatchMode,
  EmailCampaignRecipientPreview,
} from '@/types';

interface EmailCampaignFilterBuilderProps {
  matchMode: EmailCampaignMatchMode;
  rows: EmailCampaignFilterRow[];
  preview: EmailCampaignRecipientPreview;
  disabled?: boolean;
  onMatchModeChange: (mode: EmailCampaignMatchMode) => void;
  onChange: (rows: EmailCampaignFilterRow[]) => void;
}

function exclusionCountsLabel(counts?: Record<string, number>): string {
  if (!counts || Object.keys(counts).length === 0) return '';
  return Object.entries(counts)
    .map(([reason, count]) => `${reason.replace(/_/g, ' ')} ${count.toLocaleString()}`)
    .join(' · ');
}

export function EmailCampaignFilterBuilder({
  matchMode,
  rows,
  preview,
  disabled = false,
  onMatchModeChange,
  onChange,
}: EmailCampaignFilterBuilderProps) {
  const updateRow = (id: string, patch: Partial<EmailCampaignFilterRow>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const changeField = (id: string, field: EmailCampaignFilterField) => {
    const def = getFilterFieldDef(field);
    updateRow(id, {
      field,
      operator: def?.operators[0] || 'eq',
      value: '',
      value_to: '',
    });
  };

  const changeOperator = (id: string, operator: EmailCampaignFilterOperator, currentValue: string, currentValueTo: string) => {
    updateRow(id, {
      operator,
      value: operator === 'never' ? '' : currentValue,
      value_to: operator === 'between' ? currentValueTo : '',
    });
  };

  return (
    <div className="space-y-3">
      {preview.error ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">{preview.error}</p>
      ) : null}
      {preview.exclusion_counts && Object.keys(preview.exclusion_counts).length > 0 ? (
        <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          Automatically excluded: {exclusionCountsLabel(preview.exclusion_counts)}.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <ComposerFieldLabel hint="AND = every row · OR = any row">
            Match mode
          </ComposerFieldLabel>
          <Select
            value={matchMode}
            onChange={(value) => onMatchModeChange(value as EmailCampaignMatchMode)}
            options={[
              { value: 'all', label: 'All conditions (AND)' },
              { value: 'any', label: 'Any condition (OR)' },
            ]}
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...rows, createFilterRow()])}
        >
          Add filter
        </Button>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-3 py-5 text-center dark:border-gray-700">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-200">No filters yet</p>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              Add a condition to narrow who receives this email.
            </p>
          </div>
        ) : (
          rows.map((row, index) => {
            const def = getFilterFieldDef(row.field);
            const operators = def?.operators || ['eq'];
            const numeric = def?.valueType === 'number' || row.operator === 'last_x_days';
            return (
              <div
                key={row.id}
                className="rounded-lg border border-gray-200 bg-gray-50/40 p-2.5 dark:border-gray-700 dark:bg-gray-900/25"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Condition {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="mb-1 text-[10px] font-medium text-gray-500">Field</p>
                    <Select
                      value={row.field}
                      onChange={(value) => changeField(row.id, value as EmailCampaignFilterField)}
                      options={EMAIL_CAMPAIGN_FILTER_FIELDS.map((field) => ({
                        value: field.field,
                        label: field.label,
                      }))}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-medium text-gray-500">Operator</p>
                    <Select
                      value={row.operator}
                      onChange={(value) =>
                        changeOperator(
                          row.id,
                          value as EmailCampaignFilterOperator,
                          row.value,
                          row.value_to || '',
                        )
                      }
                      options={operators.map((operator) => ({
                        value: operator,
                        label: EMAIL_CAMPAIGN_FILTER_OPERATOR_LABELS[operator],
                      }))}
                      disabled={disabled}
                    />
                  </div>
                  <div className="sm:col-span-2 xl:col-span-1">
                    <p className="mb-1 text-[10px] font-medium text-gray-500">Value</p>
                    {row.operator === 'never' ? (
                      <p className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                        No value needed
                      </p>
                    ) : def?.valueType === 'enum' ? (
                      <Select
                        value={row.value}
                        onChange={(value) => updateRow(row.id, { value })}
                        options={(def.options || []).map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        placeholder="Select value"
                        disabled={disabled}
                      />
                    ) : row.operator === 'between' ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input
                          compact
                          type={numeric ? 'number' : 'date'}
                          value={row.value}
                          onChange={(e) => updateRow(row.id, { value: e.target.value })}
                          disabled={disabled}
                          placeholder={numeric ? 'Min' : 'From'}
                          min={0}
                        />
                        <Input
                          compact
                          type={numeric ? 'number' : 'date'}
                          value={row.value_to || ''}
                          onChange={(e) => updateRow(row.id, { value_to: e.target.value })}
                          disabled={disabled}
                          placeholder={numeric ? 'Max' : 'To'}
                          min={0}
                        />
                      </div>
                    ) : (
                      <Input
                        compact
                        type={numeric ? 'number' : 'date'}
                        value={row.value}
                        onChange={(e) => updateRow(row.id, { value: e.target.value })}
                        disabled={disabled}
                        placeholder={
                          row.operator === 'last_x_days'
                            ? 'Days'
                            : numeric
                              ? 'Value'
                              : 'Date'
                        }
                        min={0}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
