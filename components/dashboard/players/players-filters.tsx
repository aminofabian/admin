'use client';

import { Button, Select, DateSelect } from '@/components/ui';

// All 50 US States (exported for reuse in superadmin etc.)
export const US_STATES = [
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
    showAgentFilter?: boolean;
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
    showAgentFilter = true,
}: PlayersFiltersProps) {
    const inputClasses =
        'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
    const labelClasses =
        'block text-xs font-medium text-muted-foreground mb-1.5 transition-colors dark:text-slate-400';
    const sectionHeadingClasses =
        'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 dark:text-slate-400';

    return (
        <div className="rounded-xl border border-border bg-card shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50">
            {/* Header */}
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
                    {/* Search */}
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
                                <label className={labelClasses}>Full name</label>
                                <input
                                    type="text"
                                    value={filters.full_name}
                                    onChange={(e) => onFilterChange('full_name', e.target.value)}
                                    placeholder="Enter full name..."
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
                        </div>
                    </section>

                    {/* Filters (dropdowns) */}
                    <section>
                        <h4 className={sectionHeadingClasses}>
                            <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
                            Filters
                        </h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {showAgentFilter && (
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
                                <label className={labelClasses}>Status</label>
                                <Select
                                    value={filters.status}
                                    onChange={(v) => onFilterChange('status', v)}
                                    options={[
                                        { value: 'all', label: 'All Statuses' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                    ]}
                                    placeholder="All Statuses"
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>State</label>
                                <Select
                                    value={filters.state}
                                    onChange={(v) => onFilterChange('state', v)}
                                    options={[
                                        { value: 'all', label: 'All States' },
                                        ...US_STATES,
                                    ]}
                                    placeholder="All States"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Date range */}
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

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border dark:border-slate-700/80">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClear}
                            type="button"
                            disabled={isLoading}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                            Clear
                        </Button>
                        <Button
                            size="sm"
                            onClick={onApply}
                            type="button"
                            isLoading={isLoading}
                            disabled={isLoading}
                            className="min-w-[100px] disabled:opacity-50"
                        >
                            {isLoading ? 'Applying…' : 'Apply'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
