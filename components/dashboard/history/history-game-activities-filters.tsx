'use client';

import { Button } from '@/components/ui';

export type QueueFilterOption =
  | 'processing'
  | 'history'
  | 'recharge_game'
  | 'redeem_game'
  | 'add_user_game';

export interface HistoryGameActivitiesFiltersState {
  status: string;
  userId: string;
}

type HistoryGameActivitiesFilterKey = keyof HistoryGameActivitiesFiltersState;

const FILTER_ICON = (
  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const QUEUE_TYPE_OPTIONS: Array<{ value: QueueFilterOption; label: string }> = [
  { value: 'history', label: 'History' },
  { value: 'processing', label: 'Processing' },
  { value: 'recharge_game', label: 'Recharge Game' },
  { value: 'redeem_game', label: 'Redeem Game' },
  { value: 'add_user_game', label: 'Add User Game' },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface HistoryGameActivitiesFiltersProps {
  queueFilter: QueueFilterOption;
  onQueueFilterChange: (value: QueueFilterOption) => void;
  filters: HistoryGameActivitiesFiltersState;
  onFilterChange: (key: HistoryGameActivitiesFilterKey, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function HistoryGameActivitiesFilters({
  queueFilter,
  onQueueFilterChange,
  filters,
  onFilterChange,
  onApply,
  onClear,
  isOpen,
  onToggle,
}: HistoryGameActivitiesFiltersProps) {
  const selectClasses = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors';
  const labelClasses = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors';
  const inputClasses = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors';

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800 transition-colors">
          <div>
            <label className={labelClasses}>Queue Type</label>
            <select
              value={queueFilter}
              onChange={(event) => onQueueFilterChange(event.target.value as QueueFilterOption)}
              className={selectClasses}
            >
              {QUEUE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses}>Status</label>
            <select
              value={filters.status}
              onChange={(event) => onFilterChange('status', event.target.value)}
              className={selectClasses}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses}>User ID</label>
            <input
              type="number"
              value={filters.userId}
              onChange={(event) => onFilterChange('userId', event.target.value)}
              placeholder="Enter user ID"
              className={inputClasses}
            />
          </div>

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


