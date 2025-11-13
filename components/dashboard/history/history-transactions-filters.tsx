'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui';

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

const DATE_FIELDS: InputFieldConfig[] = [
  { key: 'date_from', label: 'Date From', type: 'date' },
  { key: 'date_to', label: 'Date To', type: 'date' },
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
  usernameOptions?: Array<{ value: string; label: string }>;
  isUsernameLoading?: boolean;
  onUsernameInputChange?: (value: string) => void;
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
  usernameOptions,
  isUsernameLoading = false,
  onUsernameInputChange,
  isLoading = false,
}: HistoryTransactionsFiltersProps) {
  const inputClasses =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
  const selectClasses =
    'w-full appearance-none px-3 py-2 pr-9 rounded-lg border border-border bg-background text-foreground text-sm shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary/30';
  const labelClasses =
    'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300';
  const effectiveStatusOptions = statusOptions ?? [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showUsernameDropdown = useMemo(() => {
    if (!isUsernameFocused) return false;
    if (isUsernameLoading) return true;
    return (usernameOptions?.length ?? 0) > 0;
  }, [isUsernameFocused, isUsernameLoading, usernameOptions?.length]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const handleUsernameFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsUsernameFocused(true);
  };

  const handleUsernameBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsUsernameFocused(false);
    }, 150);
  };

  const handleUsernameSelect = (value: string) => {
    if (!value) return;
    onFilterChange('username', value);
    onUsernameInputChange?.(value);
    setIsUsernameFocused(false);
  };

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
          <div className="relative md:col-span-1 min-w-0 z-50">
            <label className={labelClasses}>Player Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.username}
                  onChange={(event) => {
                    const value = event.target.value;
                    onFilterChange('username', value);
                    onUsernameInputChange?.(value);
                  }}
                  onFocus={handleUsernameFocus}
                  onBlur={handleUsernameBlur}
                  placeholder="Search by username..."
                  className={`${inputClasses} pr-10`}
                />
                <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 flex items-center pr-3 text-muted-foreground">
                  {isUsernameLoading ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-4.35-4.35M19 10.5a8.5 8.5 0 11-17 0 8.5 8.5 0 0117 0z"
                      />
                    </svg>
                  )}
                </div>
                {showUsernameDropdown && (
                  <div 
                    className="absolute left-0 right-0 top-full z-[9999] mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/20 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/60"
                    style={{ position: 'absolute', zIndex: 9999 }}
                  >
                    {isUsernameLoading ? (
                      <div className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                          <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        Searching users...
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-900">
                        {(usernameOptions ?? []).length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            No users found. Try a different name.
                          </div>
                        ) : (
                          <div className="divide-y divide-border dark:divide-slate-800">
                            {usernameOptions?.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted dark:hover:bg-slate-800/70 focus:bg-muted focus:outline-none dark:focus:bg-slate-800/70"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleUsernameSelect(option.value)}
                              >
                                <span className="font-medium text-foreground truncate">{option.value}</span>
                                {option.label !== option.value && (
                                  <span className="text-xs text-muted-foreground truncate ml-2">
                                    {option.label.replace(`${option.value} · `, '')}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          <div className="relative min-w-0">
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
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground dark:text-slate-500">
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

          <div className="relative min-w-0">
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
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground dark:text-slate-500">
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

          <div className="min-w-0">
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
            <div key={key} className="relative min-w-0">
              <label className={labelClasses}>{label}</label>
              <input
                type={type}
                value={filters[key]}
                onChange={(event) => onFilterChange(key, event.target.value)}
                className={`${inputClasses} relative z-20 cursor-pointer pointer-events-auto`}
                style={{ position: 'relative', zIndex: 20 }}
              />
            </div>
          ))}

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


