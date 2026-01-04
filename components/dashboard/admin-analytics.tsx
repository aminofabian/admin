'use client';

import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { formatCurrency } from '@/lib/utils/formatters';

export function AdminAnalytics() {
  const { data, loading, error } = useAdminAnalytics();

  if (loading) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 sm:h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-center text-destructive text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const stats = [
    {
      label: 'Total Cash In',
      value: formatCurrency(data.total_cash_in),
      icon: (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: 'Total Cashout',
      value: formatCurrency(data.total_cashout),
      icon: (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
    },
    {
      label: 'Total Players',
      value: data.total_players.toLocaleString(),
      icon: (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: 'Total Agents',
      value: data.total_agents.toLocaleString(),
      icon: (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: 'Total Managers',
      value: data.total_managers.toLocaleString(),
      icon: (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: 'Total Staffs',
      value: data.total_staffs.toLocaleString(),
      icon: (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-card p-2 sm:p-2.5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex flex-col gap-1.5 sm:gap-2 items-center text-center">
              {/* Icon */}
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-primary group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-200 shadow-sm">
                {stat.icon}
              </div>
              
              {/* Content */}
              <div className="space-y-0.5 w-full">
                <div className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight line-clamp-1">
                  {stat.label}
                </div>
                <div className="text-xs sm:text-sm md:text-base font-bold text-foreground truncate">
                  {stat.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

