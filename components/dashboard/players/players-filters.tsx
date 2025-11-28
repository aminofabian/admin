'use client';

import { Button, Select } from '@/components/ui';
import { useTheme } from '@/providers/theme-provider';

// All 50 US States
const US_STATES = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' },
];

export interface PlayersFiltersState {
    username: string;
    full_name: string;
    email: string;
    agent: string;
    date_from: string;
    date_to: string;
    status: string;
    state: string;
}

type PlayersFilterKey = keyof PlayersFiltersState;

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

interface PlayersFiltersProps {
    filters: PlayersFiltersState;
    onFilterChange: (key: PlayersFilterKey, value: string) => void;
    onApply: () => void;
    onClear: () => void;
    isOpen: boolean;
    onToggle: () => void;
    agentOptions?: Array<{ value: string; label: string }>;
    isAgentLoading?: boolean;
    isLoading?: boolean;
}

export function PlayersFilters({
    filters,
    onFilterChange,
    onApply,
    onClear,
    isOpen,
    onToggle,
    agentOptions,
    isAgentLoading = false,
    isLoading = false,
}: PlayersFiltersProps) {
    const { theme } = useTheme();
    const inputClasses =
        'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
    const labelClasses =
        'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300';

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
                        {/* Player Username */}
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

                        {/* Full Name */}
                        <div className="min-w-0">
                            <label className={labelClasses}>Full Name</label>
                            <input
                                type="text"
                                value={filters.full_name}
                                onChange={(event) => onFilterChange('full_name', event.target.value)}
                                placeholder="Enter full name..."
                                className={inputClasses}
                            />
                        </div>

                        {/* Email */}
                        <div className="min-w-0">
                            <label className={labelClasses}>Email</label>
                            <input
                                type="email"
                                value={filters.email}
                                onChange={(event) => onFilterChange('email', event.target.value)}
                                placeholder="Filter by email"
                                className={inputClasses}
                            />
                        </div>

                        {/* Agent */}
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

                        {/* Status */}
                        <div className="min-w-0">
                            <label className={labelClasses}>Status</label>
                            <Select
                                value={filters.status}
                                onChange={(value: string) => onFilterChange('status', value)}
                                options={[
                                    { value: 'all', label: 'All Statuses' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' },
                                ]}
                                placeholder="All Statuses"
                            />
                        </div>

                        {/* State */}
                        <div className="min-w-0">
                            <label className={labelClasses}>State</label>
                            <Select
                                value={filters.state}
                                onChange={(value: string) => onFilterChange('state', value)}
                                options={[
                                    { value: 'all', label: 'All States' },
                                    ...US_STATES,
                                ]}
                                placeholder="All States"
                            />
                        </div>

                        {/* From Date */}
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

                        {/* To Date */}
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
