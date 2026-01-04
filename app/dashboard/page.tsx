'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { SuperAdminDashboard } from '@/components/superadmin';
import { ManagerDashboard } from '@/components/manager';
import { StaffDashboard } from '@/components/staff';
import { AgentDashboard } from '@/components/agent';
import { AdminAnalytics } from '@/components/dashboard/admin-analytics';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import type { ReactNode } from 'react';

interface SectionItem {
  label: string;
  href: string;
  icon: ReactNode;
  showForSuperAdmin?: boolean;
  count?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { counts: processingCounts } = useProcessingWebSocketContext();

  // If user is superadmin, render superadmin dashboard
  if (user?.role === USER_ROLES.SUPERADMIN) {
    return <SuperAdminDashboard />;
  }

  // If user is manager, render manager dashboard
  if (user?.role === USER_ROLES.MANAGER) {
    return <ManagerDashboard />;
  }

  // If user is staff, render staff dashboard
  if (user?.role === USER_ROLES.STAFF) {
    return <StaffDashboard />;
  }

  // If user is agent, render agent dashboard
  if (user?.role === USER_ROLES.AGENT) {
    return <AgentDashboard />;
  }

  // Type guard: check if user role includes superadmin
  const isSuperAdmin = (user?.role as string) === USER_ROLES.SUPERADMIN;
  // Check if user is admin (company role)
  const isAdmin = (user?.role as string) === USER_ROLES.COMPANY;

  // All sections as mobile app-like buttons
  const sections: SectionItem[] = [
    // User Management
    ...(isSuperAdmin ? [{
      label: 'Companies',
      href: '/dashboard/companies',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      showForSuperAdmin: true,
    }] : []),
    {
      label: 'Players',
      href: '/dashboard/players',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: 'Managers',
      href: '/dashboard/managers',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: 'Agents',
      href: '/dashboard/agents',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: 'Staffs',
      href: '/dashboard/staffs',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    // Games
    {
      label: 'Games',
      href: '/dashboard/games',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
    },
    // History
    {
      label: 'Game Activities',
      href: '/dashboard/history/game-activities',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Transactions',
      href: '/dashboard/history/transactions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    // Processing
    {
      label: 'Purchase Processing',
      href: '/dashboard/processing/purchase',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 11H6L5 9z" />
        </svg>
      ),
      count: processingCounts.purchase_count,
    },
    {
      label: 'Cashout Processing',
      href: '/dashboard/processing/cashout',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8m-6 0a10 10 0 1020 0 10 10 0 00-20 0z" />
        </svg>
      ),
      count: processingCounts.cashout_count,
    },
    {
      label: 'Game Activities Processing',
      href: '/dashboard/processing/game-activities',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-4 4h2M7 20l1-4h8l1 4M6 8h12l2 4-2 4H6L4 12l2-4zM9 4h6l1 4H8l1-4z" />
        </svg>
      ),
      count: processingCounts.game_activities_count,
    },
    // Bonuses
    {
      label: 'Purchase Bonuses',
      href: '/dashboard/bonuses/purchase',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 11H6L5 9z" />
        </svg>
      ),
    },
    {
      label: 'Recharge Bonuses',
      href: '/dashboard/bonuses/recharge',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      label: 'Transfer Bonuses',
      href: '/dashboard/bonuses/transfer',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      label: 'Signup Bonuses',
      href: '/dashboard/bonuses/signup',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      label: 'First Purchase Bonuses',
      href: '/dashboard/bonuses/first-page',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    // Settings
    ...(isSuperAdmin ? [{
      label: 'Company Settings',
      href: '/dashboard/settings/company',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      showForSuperAdmin: true,
    }] : []),
    {
      label: 'Game Settings',
      href: '/dashboard/settings/games',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: 'Payment Settings',
      href: '/dashboard/settings/payment',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      label: 'Affiliate Settings',
      href: '/dashboard/settings/affiliate',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full space-y-3 sm:space-y-4 pb-4">
      {/* Page Header - Mobile App Style */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30 shadow-sm">
        <div className="relative flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
          {/* Icon */}
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-5 w-5 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          
          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage your platform and access all features
            </p>
          </div>
        </div>
      </div>

      {/* Admin Analytics Section - Only for COMPANY (admin) role */}
      {isAdmin && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-0.5 w-6 sm:w-8 bg-primary rounded-full"></div>
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Analytics Overview</h2>
            <div className="flex-1 h-0.5 bg-border rounded-full"></div>
          </div>
          <div className="rounded-xl border border-border bg-card/50 p-2 sm:p-3 shadow-sm">
            <AdminAnalytics />
          </div>
        </div>
      )}

      {/* Divider between sections */}
      {isAdmin && (
        <div className="flex items-center gap-3 py-1 sm:py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          <div className="h-1 w-1 rounded-full bg-muted-foreground/30"></div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
        </div>
      )}

      {/* Quick Access Sections - Mobile App Style */}
      <div className="flex flex-col items-center space-y-2 sm:space-y-3">
        <div className="w-full max-w-5xl px-4">
          <div className="flex items-center gap-2 px-1">
            <div className="h-0.5 w-6 sm:w-8 bg-primary rounded-full"></div>
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Quick Access</h2>
            <div className="flex-1 h-0.5 bg-border rounded-full"></div>
          </div>
        </div>
        
        <div className="w-full max-w-5xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 sm:gap-3">
            {sections.map((section, index) => (
              <Link
                key={index}
                href={section.href}
                className="group relative flex flex-col items-center justify-center bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg active:scale-95 transition-all duration-200 p-4 sm:p-5 shadow-sm"
              >
                {/* Count Badge - Corner position */}
                {section.count !== undefined && section.count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 z-10 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-[10px] font-bold rounded-full bg-gradient-to-br from-primary to-primary/80 text-white border-2 border-background shadow-lg">
                    {section.count > 99 ? '99+' : section.count}
                  </span>
                )}

                {/* Icon Container - Mobile App Style */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-200 mb-2.5 sm:mb-3 flex-shrink-0 shadow-sm">
                  <div className="text-primary">
                    {section.icon}
                  </div>
                </div>

                {/* Label - Mobile App Style */}
                <span className="text-xs sm:text-sm font-semibold text-foreground text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {section.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

