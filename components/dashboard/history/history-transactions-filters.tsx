'use client';

import { Button, Select, DateSelect } from '@/components/ui';
import { formatPaymentMethod } from '@/lib/utils/formatters';

export interface HistoryTransactionsFiltersState {
  agent: string;
  agent_id: string;
  username: string;
  email: string;
  transaction_id: string;
  operator: string;
  type: string;
  payment_method: string;
  status: string;
  game: string;
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
}

type HistoryTransactionsFilterKey = keyof HistoryTransactionsFiltersState;

interface SelectFieldConfig {
  key: HistoryTransactionsFilterKey;
  label: string;
  options: Array<{ value: string; label: string }>;
}

const BASE_SELECT_FIELDS: SelectFieldConfig[] = [
  {
    key: 'type',
    label: 'Transaction Type',
    options: [
      { value: '', label: 'All Types' },
      { value: 'purchase', label: 'Purchase' },
      { value: 'cashout', label: 'Cashout' },
      { value: 'transfer', label: 'Transfer' },
    ],
  },
];

const FILTER_ICON = (
  <svg className="w-5 h-5 text-muted-foreground transition-colors dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="filterIconGradient" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" />
      </linearGradient>
    </defs>
    <path stroke="url(#filterIconGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

interface HistoryTransactionsFiltersProps {
  filters: HistoryTransactionsFiltersState;
  onFilterChange: (key: HistoryTransactionsFilterKey, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
  statusOptions?: Array<{ value: string; label: string }>;
  agentOptions?: Array<{ value: string; label: string }>;
  isAgentLoading?: boolean;
  paymentMethodOptions?: Array<{ value: string; label: string }>;
  isPaymentMethodLoading?: boolean;
  operatorOptions?: Array<{ value: string; label: string }>;
  isOperatorLoading?: boolean;
  isLoading?: boolean;
}

export function HistoryTransactionsFilters({
  filters,
  onFilterChange,
  onApply,
  onClear,
  isOpen,
  onToggle,
  statusOptions,
  agentOptions,
  isAgentLoading = false,
  paymentMethodOptions,
  isPaymentMethodLoading = false,
  operatorOptions,
  isOperatorLoading = false,
  isLoading = false,
}: HistoryTransactionsFiltersProps) {
  const inputClasses =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
  const labelClasses =
    'block text-xs font-medium text-muted-foreground mb-1.5 transition-colors dark:text-slate-400';
  const sectionHeadingClasses =
    'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 dark:text-slate-400';
  const effectiveStatusOptions = statusOptions ?? [
    { value: '', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-slate-700/80">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          {FILTER_ICON}
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-slate-800"
        >
          {isOpen ? (
            <>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="p-4 text-foreground space-y-6">
          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Search
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClasses}>Username</label>
                <input
                  type="text"
                  value={filters.username}
                  onChange={(e) => onFilterChange('username', e.target.value)}
                  placeholder="Enter username..."
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Email</label>
                <input
                  type="email"
                  value={filters.email}
                  onChange={(e) => onFilterChange('email', e.target.value)}
                  placeholder="Filter by email"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Transaction ID</label>
                <input
                  type="text"
                  value={filters.transaction_id}
                  onChange={(e) => onFilterChange('transaction_id', e.target.value)}
                  placeholder="Enter transaction ID"
                  className={inputClasses}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Filters
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {!(Array.isArray(agentOptions) && agentOptions.length === 0) && (
                <div>
                  <label className={labelClasses}>Agent</label>
                  <Select
                    value={filters.agent}
                    onChange={(v) => onFilterChange('agent', v)}
                    options={[
                      { value: '', label: 'All Agents' },
                      ...(agentOptions || []),
                      ...(filters.agent && agentOptions && !agentOptions.some((o) => o.value === filters.agent)
                        ? [{ value: filters.agent, label: filters.agent }]
                        : []),
                    ]}
                    placeholder="All Agents"
                    isLoading={isAgentLoading}
                    disabled={isAgentLoading}
                  />
                </div>
              )}
              <div>
                <label className={labelClasses}>Payment method</label>
                <Select
                  value={filters.payment_method}
                  onChange={(v) => onFilterChange('payment_method', v)}
                  options={[
                    { value: '', label: 'All Methods' },
                    ...(paymentMethodOptions || []),
                    ...(filters.payment_method && paymentMethodOptions && !paymentMethodOptions.some((o) => o.value === filters.payment_method)
                      ? [{ value: filters.payment_method, label: formatPaymentMethod(filters.payment_method) }]
                      : []),
                  ]}
                  placeholder="All Methods"
                  isLoading={isPaymentMethodLoading}
                  disabled={isPaymentMethodLoading}
                />
              </div>
              {BASE_SELECT_FIELDS.map(({ key, label: fieldLabel, options }) => (
                <div key={key}>
                  <label className={labelClasses}>{fieldLabel}</label>
                  <Select
                    value={filters[key]}
                    onChange={(v) => onFilterChange(key, v)}
                    options={options}
                    placeholder={options[0]?.label || 'Select...'}
                  />
                </div>
              ))}
              <div>
                <label className={labelClasses}>Operator</label>
                <Select
                  value={filters.operator}
                  onChange={(v) => onFilterChange('operator', v)}
                  options={[
                    { value: '', label: 'All Operators' },
                    ...(operatorOptions || []),
                    ...(filters.operator && operatorOptions && !operatorOptions.some((o) => o.value === filters.operator)
                      ? [{ value: filters.operator, label: filters.operator }]
                      : []),
                  ]}
                  placeholder="All Operators"
                  isLoading={isOperatorLoading}
                  disabled={isOperatorLoading}
                />
              </div>
              <div>
                <label className={labelClasses}>Status</label>
                <Select
                  value={filters.status}
                  onChange={(v) => onFilterChange('status', v)}
                  options={effectiveStatusOptions}
                  placeholder={effectiveStatusOptions[0]?.label || 'All Statuses'}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Date range
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DateSelect
                label="From date"
                value={filters.date_from}
                onChange={(v) => onFilterChange('date_from', v)}
              />
              <DateSelect
                label="To date"
                value={filters.date_to}
                onChange={(v) => onFilterChange('date_to', v)}
              />
            </div>
          </section>

          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Amount
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>Min amount</label>
                <input
                  type="number"
                  value={filters.amount_min}
                  onChange={(e) => onFilterChange('amount_min', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Max amount</label>
                <input
                  type="number"
                  value={filters.amount_max}
                  onChange={(e) => onFilterChange('amount_max', e.target.value)}
                  placeholder="999999.99"
                  step="0.01"
                  className={inputClasses}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border dark:border-slate-700/80">
            <Button variant="ghost" size="sm" onClick={onClear} type="button" disabled={isLoading} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
              Clear
            </Button>
            <Button size="sm" onClick={onApply} type="button" isLoading={isLoading} disabled={isLoading} className="min-w-[100px] disabled:opacity-50">
              {isLoading ? 'Applying…' : 'Apply'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


