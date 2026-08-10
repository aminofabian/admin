'use client';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { US_STATES } from '@/components/dashboard/players/players-filters';
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Match mode</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            All conditions (AND) by default. Any condition (OR) is forwarded to the backend when
            supported.
          </p>
        </div>
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

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/40">
        {preview.loading ? (
          <p className="text-gray-500">Calculating recipient estimate…</p>
        ) : preview.error ? (
          <p className="text-amber-700 dark:text-amber-300">{preview.error}</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            <p>
              <span className="text-gray-500">Matched:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {preview.matched == null ? '—' : preview.matched.toLocaleString()}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Auto-excluded:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {preview.excluded == null ? '—' : preview.excluded.toLocaleString()}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Final recipients:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {preview.final == null ? '—' : preview.final.toLocaleString()}
              </span>
            </p>
          </div>
        )}
        {preview.unsupported.length > 0 ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Not included in live preview yet: {preview.unsupported.join(', ')}. Send still uses
            supported broadcast filters (purchase amount, SSN, state).
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 dark:border-gray-600">
            No filters yet. Add a condition to narrow the audience.
          </p>
        ) : (
          rows.map((row, index) => {
            const def = getFilterFieldDef(row.field);
            const operators = def?.operators || ['is'];
            return (
              <div
                key={row.id}
                className="grid gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-[1.2fr_1fr_1.4fr_auto]"
              >
                <div>
                  {index === 0 ? (
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Field
                    </label>
                  ) : null}
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
                  {index === 0 ? (
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Operator
                    </label>
                  ) : null}
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

                <div>
                  {index === 0 ? (
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Value
                    </label>
                  ) : null}
                  {row.operator === 'never' ? (
                    <p className="py-2 text-sm text-gray-500">No value needed</p>
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
                    <div className="max-h-28 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
                      {US_STATES.map((state) => {
                        const selected = row.value
                          .split(',')
                          .map((part) => part.trim())
                          .filter(Boolean);
                        const checked = selected.includes(state.value);
                        return (
                          <label
                            key={state.value}
                            className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
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
                            />
                            {state.label}
                          </label>
                        );
                      })}
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

                <div className={index === 0 ? 'pt-5' : ''}>
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
              </div>
            );
          })
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...rows, createFilterRow()])}
      >
        Add Filter
      </Button>
    </div>
  );
}
