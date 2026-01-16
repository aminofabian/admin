'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import {
  useTransactionSummary,
  usePaymentMethods,
  useBonusAnalytics,
} from '@/hooks/use-analytics-transactions';
import { useGameSummary, useGamesByGame } from '@/hooks/use-analytics-games';
import { Card, CardContent, CardHeader, Button, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';

// US States for filter
const US_STATES = [
  { value: '', label: 'All States' },
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

// Helper to get date range for preset
function getDateRange(preset: string): { start: string; end: string } {
  const today = new Date();
  let end = new Date(today);
  end.setHours(23, 59, 59, 999);

  let start = new Date(today);

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_30_days':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_3_months':
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// Icons as inline SVG components
const Icons = {
  Users: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  Briefcase: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  ),
  UserGroup: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  CurrencyDollar: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ArrowDownTray: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  ArrowUpTray: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  ArrowsRightLeft: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  Gift: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  ChartBar: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  Gamepad: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  XMark: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  delay?: number;
}

function StatCard({ title, value, icon, colorClass, delay = 0 }: StatCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${colorClass}`} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-current`}>
          {icon}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClass} opacity-60 group-hover:opacity-100 transition-opacity`} />
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

function MetricCard({ title, value, subtitle, icon, colorClass, bgClass }: MetricCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${bgClass} p-6 transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className={`text-2xl font-bold ${colorClass.includes('text-') ? colorClass : 'text-foreground'}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Section Header Component
function SectionHeader({ icon, title, subtitle, number }: { icon: React.ReactNode; title: string; subtitle?: string; number?: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          {number && <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{number}</span>}
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// Subsection Header Component
function SubsectionHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{number}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-10 bg-muted/50 rounded-lg w-48 animate-pulse" />
          <div className="h-5 bg-muted/30 rounded w-64 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-card/50 p-6 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-muted/50 rounded w-24" />
                  <div className="h-8 bg-muted/50 rounded w-20" />
                </div>
                <div className="h-12 w-12 bg-muted/50 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-card/50 p-6 animate-pulse">
              <div className="h-6 bg-muted/50 rounded w-48 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-muted/30 rounded" />
                <div className="h-4 bg-muted/30 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: analyticsData, loading: loadingDashboard, error: dashboardError } = useAdminAnalytics();

  // Filter state
  const [datePreset, setDatePreset] = useState('last_3_months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [username, setUsername] = useState('');
  const [state, setState] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [showFilters, setShowFilters] = useState(true);

  // Initialize date range
  useEffect(() => {
    const range = getDateRange(datePreset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [datePreset]);

  // Build filters object
  const filters = useMemo<AnalyticsFilters>(() => {
    const filterObj: AnalyticsFilters = {};
    if (startDate) filterObj.start_date = startDate;
    if (endDate) filterObj.end_date = endDate;
    if (username) filterObj.username = username;
    if (state) filterObj.state = state;
    if (gender) filterObj.gender = gender;
    return filterObj;
  }, [startDate, endDate, username, state, gender]);

  // Fetch analytics data
  const { data: transactionSummary, loading: loadingSummary } = useTransactionSummary(filters);
  const { data: paymentMethods, loading: loadingPaymentMethods } = usePaymentMethods(filters);
  const { data: bonusAnalytics, loading: loadingBonus } = useBonusAnalytics(filters);
  const { data: gameSummary, loading: loadingGameSummary } = useGameSummary(filters);
  const { data: gamesByGame, loading: loadingGamesByGame } = useGamesByGame(filters);

  // Redirect if user is not a company admin
  useEffect(() => {
    if (user && user.role !== USER_ROLES.COMPANY) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const handleClearFilters = () => {
    setDatePreset('last_3_months');
    const range = getDateRange('last_3_months');
    setStartDate(range.start);
    setEndDate(range.end);
    setUsername('');
    setState('');
    setGender('');
  };

  const hasActiveFilters = username || state || gender || datePreset !== 'last_3_months';

  // Format payment method name
  const formatPaymentMethodName = (name: string): string => {
    return name.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Loading state
  if (loadingDashboard) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (dashboardError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
            <Icons.XMark />
          </div>
          <h2 className="text-xl font-semibold mb-2">Unable to Load Analytics</h2>
          <p className="text-muted-foreground max-w-md">{dashboardError}</p>
          <Button onClick={() => window.location.reload()} className="mt-6">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Calculate max values for progress bars
  const maxPaymentPurchase = paymentMethods.length > 0
    ? Math.max(...paymentMethods.map(m => m.purchase ?? 0))
    : 0;
  const maxGameRecharge = gamesByGame.length > 0
    ? Math.max(...gamesByGame.map(g => g.recharge ?? 0))
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-8">
        
        {/* ═══════════════════════════════════════════════════════════════════════
            HEADER 
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 border border-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <Icons.ChartBar />
                </div>
                <span className="text-sm font-medium text-primary uppercase tracking-wider">Analytics Dashboard</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Business Intelligence</h1>
              <p className="text-muted-foreground max-w-lg">
                Transaction analytics, payment methods, bonuses, and game activity metrics.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Icons.Filter />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-primary-foreground/20 rounded-full">Active</span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 3: FILTERS
        ═══════════════════════════════════════════════════════════════════════ */}
        {showFilters && (
          <Card className="relative z-10 border-primary/20 bg-card/95 backdrop-blur-md shadow-xl mb-6">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icons.Filter />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">3</span>
                      <h3 className="text-lg font-semibold">Filters</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Refine data by date, user, location, or gender</p>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground hover:text-foreground gap-2">
                    <Icons.XMark />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {/* 3.1 Date Filter */}
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Icons.Calendar />
                    <span className="text-xs text-muted-foreground">3.1</span>
                    Date Range
                  </label>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Select
                      value={datePreset}
                      onChange={(value: string) => handlePresetChange(value)}
                      options={[
                        { value: 'today', label: 'Today' },
                        { value: 'yesterday', label: 'Yesterday' },
                        { value: 'this_month', label: 'This Month' },
                        { value: 'last_month', label: 'Last Month' },
                        { value: 'last_30_days', label: 'Last 30 Days' },
                        { value: 'last_3_months', label: 'Last 3 Months' },
                        { value: 'custom', label: 'Custom Range' },
                      ]}
                    />
                    {datePreset === 'custom' && (
                      <>
                        <div className="date-input-wrapper">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            max={endDate || undefined}
                            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="date-input-wrapper">
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || undefined}
                            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 3.2 Username Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">3.2</span>
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Exact username"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* 3.3 State Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">3.3</span>
                    State
                  </label>
                  <Select
                    value={state}
                    onChange={(value: string) => setState(value)}
                    options={US_STATES}
                    placeholder="All States"
                  />
                </div>

                {/* 3.4 Gender Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">3.4</span>
                    Gender
                  </label>
                  <Select
                    value={gender}
                    onChange={(value: string) => setGender(value as 'male' | 'female' | '')}
                    options={[
                      { value: '', label: 'All' },
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                    ]}
                    placeholder="All"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TEAM OVERVIEW (Non-spec, but useful context)
        ═══════════════════════════════════════════════════════════════════════ */}
        {analyticsData && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 relative z-0">
            <StatCard title="Players" value={analyticsData.total_players ?? 0} icon={<Icons.Users />} colorClass="bg-gradient-to-r from-blue-500 to-cyan-500 text-blue-500" delay={0} />
            <StatCard title="Managers" value={analyticsData.total_managers ?? 0} icon={<Icons.Briefcase />} colorClass="bg-gradient-to-r from-violet-500 to-purple-500 text-violet-500" delay={100} />
            <StatCard title="Agents" value={analyticsData.total_agents ?? 0} icon={<Icons.UserGroup />} colorClass="bg-gradient-to-r from-amber-500 to-orange-500 text-amber-500" delay={200} />
            <StatCard title="Staff" value={analyticsData.total_staffs ?? 0} icon={<Icons.Shield />} colorClass="bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-500" delay={300} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 1: TRANSACTION ANALYTICS
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-6">
          <SectionHeader
            icon={<Icons.CurrencyDollar />}
            title="Transaction Analytics"
            number="1"
          />

          {/* 1.1 Summary Metrics */}
          <div className="space-y-4">
            <SubsectionHeader title="Summary Metrics" number="1.1" />
            <p className="text-sm text-muted-foreground -mt-2 mb-4">
              Excludes manual and bonus transactions
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {loadingSummary ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-card/50 p-6 animate-pulse">
                    <div className="h-4 bg-muted/50 rounded w-24 mb-3" />
                    <div className="h-8 bg-muted/50 rounded w-32" />
                  </div>
                ))
              ) : transactionSummary ? (
                <>
                  <MetricCard
                    title="Total Purchase"
                    value={formatCurrency(transactionSummary.total_purchase)}
                    subtitle="Sum of completed purchases (excl. manual/bonus)"
                    icon={<Icons.ArrowDownTray />}
                    colorClass="text-emerald-500"
                    bgClass="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
                  />
                  <MetricCard
                    title="Total Cashout"
                    value={formatCurrency(transactionSummary.total_cashout)}
                    subtitle="Sum of completed cashouts (excl. manual/bonus)"
                    icon={<Icons.ArrowUpTray />}
                    colorClass="text-rose-500"
                    bgClass="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20"
                  />
                  <MetricCard
                    title="Total Transfer"
                    value={formatCurrency(transactionSummary.total_transfer)}
                    subtitle="Sum of transfers (excl. bonus)"
                    icon={<Icons.ArrowsRightLeft />}
                    colorClass="text-blue-500"
                    bgClass="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
                  />
                </>
              ) : (
                <div className="col-span-3 text-center py-8 text-muted-foreground">No transaction data available</div>
              )}
            </div>
          </div>

          {/* 1.2 Payment Method Breakdown */}
          <div className="space-y-4">
            <SubsectionHeader title="Payment Method Breakdown" number="1.2" />
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icons.CreditCard />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase, Bonus, Avg Bonus %, Cashout, Success Rate, Avg Transaction Size, Usage %</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPaymentMethods ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted/50 rounded w-32 mb-2" />
                        <div className="h-3 bg-muted/30 rounded" />
                      </div>
                    ))}
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left p-4 font-medium">Payment Method</th>
                          <th className="text-right p-4 font-medium">Purchase</th>
                          <th className="text-right p-4 font-medium">Bonus</th>
                          <th className="text-right p-4 font-medium">Avg Bonus %</th>
                          <th className="text-right p-4 font-medium">Cashout</th>
                          <th className="text-right p-4 font-medium">Success Rate</th>
                          <th className="text-right p-4 font-medium">Avg Tx Size</th>
                          <th className="text-right p-4 font-medium">Usage %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {paymentMethods.map((method, idx) => (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                  {formatPaymentMethodName(method.payment_method).charAt(0)}
                                </div>
                                <span className="font-medium">{formatPaymentMethodName(method.payment_method)}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-semibold text-emerald-500">
                              {formatCurrency(method.purchase ?? 0)}
                            </td>
                            <td className="p-4 text-right text-amber-500">
                              {formatCurrency(method.bonus ?? 0)}
                            </td>
                            <td className="p-4 text-right">
                              {method.average_bonus_pct?.toFixed(1) ?? 0}%
                            </td>
                            <td className="p-4 text-right text-rose-500">
                              {formatCurrency(method.cashout ?? 0)}
                            </td>
                            <td className="p-4 text-right">
                              <span className={method.success_rate && method.success_rate >= 90 ? 'text-emerald-500' : method.success_rate && method.success_rate >= 70 ? 'text-amber-500' : 'text-rose-500'}>
                                {method.success_rate?.toFixed(1) ?? 0}%
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {formatCurrency(method.average_transaction_size ?? 0)}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${method.usage_distribution_pct ?? 0}%` }} />
                                </div>
                                <span className="text-xs w-10">{method.usage_distribution_pct?.toFixed(1) ?? 0}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No payment method data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 1.3 Bonus Analytics */}
          <div className="space-y-4">
            <SubsectionHeader title="Bonus Analytics" number="1.3" />
            {loadingBonus ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-card/50 p-6 animate-pulse">
                    <div className="h-4 bg-muted/50 rounded w-24 mb-3" />
                    <div className="h-8 bg-muted/50 rounded w-32" />
                  </div>
                ))}
              </div>
            ) : bonusAnalytics ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <MetricCard
                    title="Total Bonus"
                    value={formatCurrency(bonusAnalytics.total_bonus)}
                    subtitle="Sum of all bonus amounts across all types"
                    icon={<Icons.Sparkles />}
                    colorClass="text-amber-500"
                    bgClass="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/20"
                  />
                </div>
                <MetricCard
                  title="Purchase Bonus"
                  value={formatCurrency(bonusAnalytics.purchase_bonus)}
                  subtitle="Sum of purchase bonus amounts"
                  icon={<Icons.ArrowDownTray />}
                  colorClass="text-emerald-500"
                  bgClass="bg-card/80 border border-border/50"
                />
                <MetricCard
                  title="Avg Purchase Bonus %"
                  value={`${bonusAnalytics.average_purchase_bonus_percent?.toFixed(2) ?? 0}%`}
                  subtitle="(Purchase Bonus / Total Purchase) × 100"
                  icon={<Icons.ChartBar />}
                  colorClass="text-emerald-500"
                  bgClass="bg-card/80 border border-border/50"
                />
                <MetricCard
                  title="Signup Bonus"
                  value={formatCurrency(bonusAnalytics.signup_bonus)}
                  subtitle="Welcome/signup bonus amounts"
                  icon={<Icons.Users />}
                  colorClass="text-blue-500"
                  bgClass="bg-card/80 border border-border/50"
                />
                <MetricCard
                  title="First Deposit Bonus"
                  value={formatCurrency(bonusAnalytics.first_deposit_bonus)}
                  subtitle="First deposit bonus amounts"
                  icon={<Icons.CurrencyDollar />}
                  colorClass="text-violet-500"
                  bgClass="bg-card/80 border border-border/50"
                />
                <MetricCard
                  title="Transfer Bonus"
                  value={formatCurrency(bonusAnalytics.transfer_bonus)}
                  subtitle="Bonus from transfer transactions"
                  icon={<Icons.ArrowsRightLeft />}
                  colorClass="text-cyan-500"
                  bgClass="bg-card/80 border border-border/50"
                />
                <MetricCard
                  title="Avg Transfer Bonus %"
                  value={`${bonusAnalytics.average_transfer_bonus_percent?.toFixed(2) ?? 0}%`}
                  subtitle="(Transfer Bonus / Total Transfer) × 100"
                  icon={<Icons.ChartBar />}
                  colorClass="text-cyan-500"
                  bgClass="bg-card/80 border border-border/50"
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No bonus data available</div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2: GAME ACTIVITY ANALYTICS
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-6">
          <SectionHeader
            icon={<Icons.Gamepad />}
            title="Game Activity Analytics"
            number="2"
          />

          {/* 2.1 Summary Metrics (All Games Combined) */}
          <div className="space-y-4">
            <SubsectionHeader title="Summary Metrics (All Games Combined)" number="2.1" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {loadingGameSummary ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-card/50 p-6 animate-pulse">
                    <div className="h-4 bg-muted/50 rounded w-24 mb-3" />
                    <div className="h-8 bg-muted/50 rounded w-32" />
                  </div>
                ))
              ) : gameSummary ? (
                <>
                  <MetricCard
                    title="Total Recharge"
                    value={formatCurrency(gameSummary.total_recharge)}
                    subtitle="Sum of all game recharges (base)"
                    icon={<Icons.ArrowDownTray />}
                    colorClass="text-emerald-500"
                    bgClass="bg-card/80 border border-border/50"
                  />
                  <MetricCard
                    title="Total Bonus"
                    value={formatCurrency(gameSummary.total_bonus)}
                    subtitle="Sum of all game recharge bonuses"
                    icon={<Icons.Gift />}
                    colorClass="text-amber-500"
                    bgClass="bg-card/80 border border-border/50"
                  />
                  <MetricCard
                    title="Average Bonus %"
                    value={`${gameSummary.average_bonus_percent?.toFixed(2) ?? 0}%`}
                    subtitle="(Total Bonus / Total Recharge) × 100"
                    icon={<Icons.ChartBar />}
                    colorClass="text-amber-500"
                    bgClass="bg-card/80 border border-border/50"
                  />
                  <MetricCard
                    title="Total Redeem"
                    value={formatCurrency(gameSummary.total_redeem)}
                    subtitle="Sum of all game redemptions"
                    icon={<Icons.ArrowUpTray />}
                    colorClass="text-rose-500"
                    bgClass="bg-card/80 border border-border/50"
                  />
                  <MetricCard
                    title="Net Game Activity"
                    value={formatCurrency(gameSummary.net_game_activity)}
                    subtitle="(Recharge + Bonus) - Redeem"
                    icon={<Icons.ChartBar />}
                    colorClass={gameSummary.net_game_activity >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                    bgClass={gameSummary.net_game_activity >= 0 
                      ? 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20'
                      : 'bg-gradient-to-br from-rose-500/15 to-rose-500/5 border border-rose-500/20'
                    }
                  />
                </>
              ) : (
                <div className="col-span-5 text-center py-8 text-muted-foreground">No game summary data available</div>
              )}
            </div>
          </div>

          {/* 2.2 Per-Game Breakdown */}
          <div className="space-y-4">
            <SubsectionHeader title="Per-Game Breakdown" number="2.2" />
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/50 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icons.Gamepad />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recharge, Bonus, Avg Bonus %, Redeem, Net Activity per game</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingGamesByGame ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted/50 rounded w-32 mb-2" />
                        <div className="h-3 bg-muted/30 rounded" />
                      </div>
                    ))}
                  </div>
                ) : gamesByGame.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left p-4 font-medium">Game</th>
                          <th className="text-right p-4 font-medium">Recharge</th>
                          <th className="text-right p-4 font-medium">Bonus</th>
                          <th className="text-right p-4 font-medium">Avg Bonus %</th>
                          <th className="text-right p-4 font-medium">Redeem</th>
                          <th className="text-right p-4 font-medium">Net Activity</th>
                          <th className="text-left p-4 font-medium w-32">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {gamesByGame.map((game, idx) => (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                  <Icons.Gamepad />
                                </div>
                                <span className="font-medium">{game.game_title}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-semibold text-emerald-500">
                              {formatCurrency(game.recharge)}
                            </td>
                            <td className="p-4 text-right text-amber-500">
                              {formatCurrency(game.bonus)}
                            </td>
                            <td className="p-4 text-right">
                              {game.average_bonus_percent?.toFixed(1) ?? 0}%
                            </td>
                            <td className="p-4 text-right text-rose-500">
                              {formatCurrency(game.redeem)}
                            </td>
                            <td className="p-4 text-right">
                              <span className={`font-semibold ${game.net_game_activity >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {formatCurrency(game.net_game_activity)}
                              </span>
                            </td>
                            <td className="p-4">
                              <ProgressBar
                                value={game.recharge ?? 0}
                                max={maxGameRecharge}
                                colorClass="bg-gradient-to-r from-violet-500 to-purple-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No game data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </div>
  );
}
