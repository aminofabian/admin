'use client';

import { Button, Select } from '@/components/ui';
import { useTheme } from '@/providers/theme-provider';

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

interface InputFieldConfig {
  key: HistoryTransactionsFilterKey;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'date' | 'number';
  step?: string;
}

interface SelectFieldConfig {
  key: HistoryTransactionsFilterKey;
  label: string;
  options: Array<{ value: string; label: string }>;
}

const TEXT_FIELDS: InputFieldConfig[] = [
  { key: 'email', label: 'Email', placeholder: 'Filter by email', type: 'email' },
  { key: 'transaction_id', label: 'Transaction ID', placeholder: 'Enter transaction ID' },
];

const BASE_SELECT_FIELDS: SelectFieldConfig[] = [
  {
    key: 'operator',
    label: 'Operator Type',
    options: [
      { value: '', label: 'All Types' },
      { value: 'bot', label: 'Bot' },
      { value: 'admin', label: 'Admin' },
    ],
  },
  {
    key: 'type',
    label: 'Transaction Type',
    options: [
      { value: '', label: 'All Types' },
      { value: 'purchase', label: 'Purchase' },
      { value: 'cashout', label: 'Cashout' },
    ],
  },
];

const AMOUNT_FIELDS: InputFieldConfig[] = [
  { key: 'amount_min', label: 'Min Amount', type: 'number', placeholder: '0.00', step: '0.01' },
  { key: 'amount_max', label: 'Max Amount', type: 'number', placeholder: '999999.99', step: '0.01' },
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
  gameOptions?: Array<{ value: string; label: string }>;
  isGameLoading?: boolean;
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
  gameOptions,
  isGameLoading = false,
  isLoading = false,
}: HistoryTransactionsFiltersProps) {
  const { theme } = useTheme();
  const inputClasses =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
  const labelClasses =
    'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300';
  const effectiveStatusOptions = statusOptions ?? [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];


  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-md shadow-black/5 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-900/40">
      <div className="flex items-center justify-between text-foreground">
        <h3 className="flex items-center gap-3 text-base font-semibold text-foreground transition-colors">
          {FILTER_ICON}
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground dark:hover:bg-slate-800/70"
        >
          {isOpen ? (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide Filters
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show Filters
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="pt-5 text-foreground transition-colors">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
          <div className="min-w-0">
            <label className={labelClasses}>Player Username</label>
            <input
              type="text"
              value={filters.username}
              onChange={(event) => onFilterChange('username', event.target.value)}
              placeholder="Enter username..."
              className={inputClasses}
            />
          </div>

          <div className="min-w-0">
            <label className={labelClasses}>Agent</label>
            <Select
              value={filters.agent}
              onChange={(value: string) => onFilterChange('agent', value)}
              options={[
                { value: '', label: 'All Agents' },
                ...(agentOptions || []),
                ...(filters.agent && agentOptions && !agentOptions.some((option) => option.value === filters.agent)
                  ? [{ value: filters.agent, label: filters.agent }]
                  : []),
              ]}
              placeholder="All Agents"
              isLoading={isAgentLoading}
              disabled={isAgentLoading}
            />
          </div>

          <div className="min-w-0">
            <label className={labelClasses}>Payment Method</label>
            <Select
              value={filters.payment_method}
              onChange={(value: string) => onFilterChange('payment_method', value)}
              options={[
                { value: '', label: 'All Methods' },
                ...(paymentMethodOptions || []),
                ...(filters.payment_method && paymentMethodOptions && !paymentMethodOptions.some((option) => option.value === filters.payment_method)
                  ? [{ value: filters.payment_method, label: filters.payment_method }]
                  : []),
              ]}
              placeholder="All Methods"
              isLoading={isPaymentMethodLoading}
              disabled={isPaymentMethodLoading}
            />
          </div>

          {TEXT_FIELDS.map(({ key, label, placeholder, type = 'text' }) => (
            <div key={key} className="min-w-0">
              <label className={labelClasses}>{label}</label>
              <input
                type={type}
                value={filters[key]}
                onChange={(event) => onFilterChange(key, event.target.value)}
                placeholder={placeholder}
                className={inputClasses}
              />
            </div>
          ))}

          {BASE_SELECT_FIELDS.map(({ key, label, options }) => (
            <div key={key} className="min-w-0">
              <label className={labelClasses}>{label}</label>
              <Select
                value={filters[key]}
                onChange={(value: string) => onFilterChange(key, value)}
                options={options}
                placeholder={options[0]?.label || 'Select...'}
              />
            </div>
          ))}

          <div className="min-w-0">
            <label className={labelClasses}>Status</label>
            <Select
              value={filters.status}
              onChange={(value: string) => onFilterChange('status', value)}
              options={effectiveStatusOptions}
              placeholder={effectiveStatusOptions[0]?.label || 'All Statuses'}
            />
          </div>

          <div className="min-w-0">
            <label className={labelClasses}>Game</label>
            <Select
              value={filters.game}
              onChange={(value: string) => onFilterChange('game', value)}
              options={[
                { value: '', label: 'All Games' },
                ...(gameOptions || []),
                ...(filters.game && gameOptions && !gameOptions.some((option) => option.value === filters.game)
                  ? [{ value: filters.game, label: filters.game }]
                  : []),
              ]}
              placeholder="All Games"
              isLoading={isGameLoading}
              disabled={isGameLoading}
            />
          </div>

          {/* Date Range - Compact Design */}
          <div className="min-w-0">
            <label className={labelClasses}>From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(event) => onFilterChange('date_from', event.target.value)}
              max={filters.date_to || undefined}
              className={inputClasses}
              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
            />
          </div>

          <div className="min-w-0">
            <label className={labelClasses}>To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(event) => onFilterChange('date_to', event.target.value)}
              min={filters.date_from || undefined}
              className={inputClasses}
              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
            />
          </div>

          {AMOUNT_FIELDS.map(({ key, label, placeholder, type = 'number', step }) => (
            <div key={key} className="min-w-0">
              <label className={labelClasses}>{label}</label>
              <input
                type={type}
                value={filters[key]}
                onChange={(event) => onFilterChange(key, event.target.value)}
                placeholder={placeholder}
                step={step}
                className={inputClasses}
              />
            </div>
          ))}

          <div className="col-span-full flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClear}
              type="button"
              disabled={isLoading}
              className="hover:bg-muted/80 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Filters
            </Button>
            <Button 
              size="sm" 
              onClick={onApply}
              type="button"
              isLoading={isLoading}
              disabled={isLoading}
              className="hover:opacity-90 active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                    <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  Applying...
                </>
              ) : (
                'Apply Filters'
              )}
            </Button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}


