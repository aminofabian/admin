'use client';

import { Button } from '@/components/ui';

export interface HistoryTransactionsFiltersState {
  agent: string;
  username: string;
  email: string;
  transaction_id: string;
  operator: string;
  type: string;
  payment_method: string;
  status: string;
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
  { key: 'username', label: 'Username', placeholder: 'Filter by username' },
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

const DATE_FIELDS: InputFieldConfig[] = [
  { key: 'date_from', label: 'Date From', type: 'date' },
  { key: 'date_to', label: 'Date To', type: 'date' },
];

const AMOUNT_FIELDS: InputFieldConfig[] = [
  { key: 'amount_min', label: 'Min Amount', type: 'number', placeholder: '0.00', step: '0.01' },
  { key: 'amount_max', label: 'Max Amount', type: 'number', placeholder: '999999.99', step: '0.01' },
];

const FILTER_ICON = (
  <svg className="w-5 h-5 text-slate-600 transition-colors dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
}: HistoryTransactionsFiltersProps) {
const inputClasses = 'w-full px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-900 text-slate-100 placeholder-slate-500 shadow-sm transition-all duration-150 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-slate-500/50';
const selectClasses = 'w-full appearance-none px-3 py-2 pr-9 rounded-lg border border-slate-700/70 bg-slate-900 text-slate-100 text-sm shadow-sm transition-all duration-150 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-slate-500/50';
const labelClasses = 'block text-xs font-semibold uppercase tracking-wide text-slate-300 dark:text-slate-300 mb-2 transition-colors';
  const effectiveStatusOptions = statusOptions ?? [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/95 p-5 shadow-lg shadow-slate-900/40 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between text-slate-100">
        <h3 className="flex items-center gap-3 text-base font-semibold text-slate-100 transition-colors">
          {FILTER_ICON}
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-300 transition-all duration-150 hover:bg-slate-800/70 hover:text-slate-100"
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
        <div className="grid grid-cols-1 gap-4 pt-5 text-slate-100 transition-colors md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="relative">
            <label className={labelClasses}>Agent</label>
            <select
              value={filters.agent}
              onChange={(event) => onFilterChange('agent', event.target.value)}
              className={`${selectClasses} ${isAgentLoading ? 'opacity-75' : ''}`}
            >
              <option value="">All Agents</option>
              {isAgentLoading && (
                <option value="" disabled>
                  Loading agents...
                </option>
              )}
              {!isAgentLoading && agentOptions?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {!isAgentLoading && filters.agent && agentOptions && !agentOptions.some((option) => option.value === filters.agent) && (
                <option value={filters.agent}>
                  {filters.agent}
                </option>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 dark:text-slate-500">
              {isAgentLoading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>

          <div className="relative">
            <label className={labelClasses}>Payment Method</label>
            <select
              value={filters.payment_method}
              onChange={(event) => onFilterChange('payment_method', event.target.value)}
              className={`${selectClasses} ${isPaymentMethodLoading ? 'opacity-75' : ''}`}
            >
              <option value="">All Methods</option>
              {isPaymentMethodLoading && (
                <option value="" disabled>
                  Loading methods...
                </option>
              )}
              {!isPaymentMethodLoading && paymentMethodOptions?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {!isPaymentMethodLoading && filters.payment_method && paymentMethodOptions && !paymentMethodOptions.some((option) => option.value === filters.payment_method) && (
                <option value={filters.payment_method}>
                  {filters.payment_method}
                </option>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 dark:text-slate-500">
              {isPaymentMethodLoading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>

          {TEXT_FIELDS.map(({ key, label, placeholder, type = 'text' }) => (
            <div key={key}>
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
            <div key={key}>
              <label className={labelClasses}>{label}</label>
              <select
                value={filters[key]}
                onChange={(event) => onFilterChange(key, event.target.value)}
                className={selectClasses}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div>
            <label className={labelClasses}>Status</label>
            <select
              value={filters.status}
              onChange={(event) => onFilterChange('status', event.target.value)}
              className={selectClasses}
            >
              {effectiveStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {DATE_FIELDS.map(({ key, label, type = 'date' }) => (
            <div key={key}>
              <label className={labelClasses}>{label}</label>
              <input
                type={type}
                value={filters[key]}
                onChange={(event) => onFilterChange(key, event.target.value)}
                className={inputClasses}
              />
            </div>
          ))}

          {AMOUNT_FIELDS.map(({ key, label, placeholder, type = 'number', step }) => (
            <div key={key}>
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

          <div className="col-span-full flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear Filters
            </Button>
            <Button size="sm" onClick={onApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


