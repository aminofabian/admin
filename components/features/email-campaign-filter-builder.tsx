'use client';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { US_STATES } from '@/components/dashboard/players/players-filters';
import {
  ComposerFieldLabel,
  ComposerMetric,
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
      operator: def?.operators[0] || 'is',
      value: '',
      value_to: '',
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <ComposerMetric
          label="Matched"
          value={
            preview.loading
              ? '…'
              : preview.matched == null
                ? '—'
                : preview.matched.toLocaleString()
          }
        />
        <ComposerMetric
          label="Auto-excluded"
          value={
            preview.excluded == null ? '—' : preview.excluded.toLocaleString()
          }
          tone="warning"
        />
        <ComposerMetric
          label="Final recipients"
          value={
            preview.loading
              ? '…'
              : preview.final == null
                ? '—'
                : preview.final.toLocaleString()
          }
          tone="success"
        />
      </div>

      {preview.error ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{preview.error}</p>
      ) : null}
      {preview.unsupported.length > 0 ? (
        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          Not in live preview yet: {preview.unsupported.join(', ')}. Send still applies purchase
          amount, SSN, and state on the broadcast API.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] md:items-end">
        <div>
          <ComposerFieldLabel hint="AND matches everyone who satisfies every row. OR is forwarded when the backend supports it.">
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
          className="md:mb-0.5"
        >
          Add filter
        </Button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No filters yet</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Add a condition to narrow who receives this email.
            </p>
          </div>
        ) : (
          rows.map((row, index) => {
            const def = getFilterFieldDef(row.field);
            const operators = def?.operators || ['is'];
            return (
              <div
                key={row.id}
                className="rounded-xl border border-gray-200 bg-gray-50/40 p-3 dark:border-gray-700 dark:bg-gray-900/25"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
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

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="mb-1 text-[11px] font-medium text-gray-500">Field</p>
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
                    <p className="mb-1 text-[11px] font-medium text-gray-500">Operator</p>
                    <Select
                      value={row.operator}
                      onChange={(value) =>
                        updateRow(row.id, {
                          operator: value as EmailCampaignFilterOperator,
                          value: value === 'never' ? '' : row.value,
                        })
                      }
                      options={operators.map((operator) => ({
                        value: operator,
                        label: EMAIL_CAMPAIGN_FILTER_OPERATOR_LABELS[operator],
                      }))}
                      disabled={disabled}
                    />
                  </div>
                  <div className="sm:col-span-2 xl:col-span-1">
                    <p className="mb-1 text-[11px] font-medium text-gray-500">Value</p>
                    {row.operator === 'never' ? (
                      <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
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
                    ) : def?.valueType === 'states' ? (
                      <div className="max-h-36 overflow-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2">
                          {US_STATES.map((state) => {
                            const selected = row.value
                              .split(',')
                              .map((part) => part.trim())
                              .filter(Boolean);
                            const checked = selected.includes(state.value);
                            return (
                              <label
                                key={state.value}
                                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => {
                                    const next = checked
                                      ? selected.filter((code) => code !== state.value)
                                      : [...selected, state.value];
                                    updateRow(row.id, { value: next.join(',') });
                                  }}
                                  className="rounded border-gray-300 text-[#6366f1] focus:ring-[#6366f1]"
                                />
                                <span className="truncate">
                                  {state.label}
                                  <span className="ml-1 text-gray-400">{state.value}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : row.operator === 'between' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type={def?.valueType === 'number' ? 'number' : 'date'}
                          value={row.value}
                          onChange={(e) => updateRow(row.id, { value: e.target.value })}
                          disabled={disabled}
                          placeholder="From"
                        />
                        <Input
                          type={def?.valueType === 'number' ? 'number' : 'date'}
                          value={row.value_to || ''}
                          onChange={(e) => updateRow(row.id, { value_to: e.target.value })}
                          disabled={disabled}
                          placeholder="To"
                        />
                      </div>
                    ) : (
                      <Input
                        type={
                          row.operator === 'last_x_days' || def?.valueType === 'number'
                            ? 'number'
                            : def?.valueType === 'date'
                              ? 'date'
                              : 'text'
                        }
                        value={row.value}
                        onChange={(e) => updateRow(row.id, { value: e.target.value })}
                        disabled={disabled}
                        placeholder={
                          row.operator === 'last_x_days'
                            ? 'Days'
                            : def?.valueType === 'number'
                              ? 'Amount'
                              : 'Value'
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
