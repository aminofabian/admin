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
  { key: 'agent', label: 'Agent', placeholder: 'Filter by agent' },
  { key: 'username', label: 'Username', placeholder: 'Filter by username' },
  { key: 'email', label: 'Email', placeholder: 'Filter by email', type: 'email' },
  { key: 'transaction_id', label: 'Transaction ID', placeholder: 'Enter transaction ID' },
];

const SELECT_FIELDS: SelectFieldConfig[] = [
  {
    key: 'operator',
    label: 'Operator Type',
    options: [
      { value: '', label: 'All Types' },
      { value: 'bot', label: 'Bot' },
      { value: 'manual', label: 'Manual' },
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
  {
    key: 'payment_method',
    label: 'Payment Method',
    options: [
      { value: '', label: 'All Methods' },
      { value: 'bitcoin', label: 'Bitcoin' },
      { value: 'litecoin', label: 'Litecoin' },
      { value: 'bitcoin_lightning', label: 'Bitcoin Lightning' },
      { value: 'manual', label: 'Manual' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
      { value: 'cancelled', label: 'Cancelled' },
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
  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

interface HistoryTransactionsFiltersProps {
  filters: HistoryTransactionsFiltersState;
  onFilterChange: (key: HistoryTransactionsFilterKey, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function HistoryTransactionsFilters({
  filters,
  onFilterChange,
  onApply,
  onClear,
  isOpen,
  onToggle,
}: HistoryTransactionsFiltersProps) {
  const inputClasses = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors';
  const selectClasses = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors';
  const labelClasses = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-black/20 p-4 space-y-4 transition-colors">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 transition-colors">
          {FILTER_ICON}
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800 transition-colors">
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

          {SELECT_FIELDS.map(({ key, label, options }) => (
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


