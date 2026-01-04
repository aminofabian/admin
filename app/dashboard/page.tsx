'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { SuperAdminDashboard } from '@/components/superadmin';
import { ManagerDashboard } from '@/components/manager';
import { StaffDashboard } from '@/components/staff';
import { AgentDashboard } from '@/components/agent';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';

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

  // Grouped sections by category
  const sectionGroups = [
    {
      title: 'User Management',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
      sections: [
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
      ],
    },
    {
      title: 'Games & Activities',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
      color: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
      sections: [
        {
          label: 'Games',
          href: '/dashboard/games',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          ),
        },
        {
          label: 'Game Activities',
          href: '/dashboard/history/game-activities',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Transactions',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-green-500/10 to-green-600/5 border-green-500/20',
      sections: [
        {
          label: 'Transactions',
          href: '/dashboard/history/transactions',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Processing',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      color: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
      sections: [
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
      ],
    },
    {
      title: 'Bonuses',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2v7m0 0v5a2 2 0 11-4 0v-5m4 0H9m3 0h3" />
        </svg>
      ),
      color: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20',
      sections: [
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
      ],
    },
    {
      title: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'from-gray-500/10 to-gray-600/5 border-gray-500/20',
      sections: [
        ...(isSuperAdmin ? [{
          label: 'Company Settings',
          href: '/dashboard/settings/company',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
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
      ],
    },
    ...(isSuperAdmin ? [{
      title: 'System',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'from-red-500/10 to-red-600/5 border-red-500/20',
      sections: [
        {
          label: 'Companies',
          href: '/dashboard/companies',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
      ],
    }] : []),
  ];


  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-120px)] space-y-2 pb-2">


      {/* Quick Access Sections - Mobile App Style with Grouping */}
      <div className="flex flex-col items-center space-y-2">
        <div className="w-full max-w-5xl px-4">
          <div className="flex items-center gap-1.5 px-1">
            <div className="h-0.5 w-4 bg-primary rounded-full"></div>
            <h2 className="text-[8px] sm:text-[9px] font-light text-foreground/70">Quick Access</h2>
            <div className="flex-1 h-0.5 bg-border rounded-full"></div>
          </div>
        </div>
        
        <div className="w-full max-w-5xl px-4 space-y-4">
          {(() => {
            // Combine small groups (1-2 items) with next group
            const optimizedGroups: Array<{
              groups: typeof sectionGroups;
              combined: boolean;
            }> = [];
            
            for (let i = 0; i < sectionGroups.length; i++) {
              const currentGroup = sectionGroups[i];
              const nextGroup = sectionGroups[i + 1];
              
              // If current group has 1-2 items and there's a next group, combine them
              if (currentGroup.sections.length <= 2 && nextGroup) {
                optimizedGroups.push({
                  groups: [currentGroup, nextGroup],
                  combined: true,
                });
                i++; // Skip next group as it's already included
              } else {
                optimizedGroups.push({
                  groups: [currentGroup],
                  combined: false,
                });
              }
            }
            
            return optimizedGroups.map((optimizedGroup, optimizedIndex) => {
              if (optimizedGroup.combined && optimizedGroup.groups.length === 2) {
                // Combined groups - render together with visual distinction
                const [firstGroup, secondGroup] = optimizedGroup.groups;
                return (
                  <div
                    key={optimizedIndex}
                    className="rounded-lg border bg-gradient-to-br from-muted/30 to-muted/10 p-2 shadow-sm"
                  >
                    {/* Combined Header */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`flex items-center justify-center w-4 h-4 rounded bg-gradient-to-br ${firstGroup.color.split(' ')[0]} ${firstGroup.color.split(' ')[1]} shadow-sm`}>
                          <div className="text-foreground/70">
                            {firstGroup.icon}
                          </div>
                        </div>
                        <h3 className="text-[8px] sm:text-[9px] font-light text-foreground/70 uppercase tracking-wide">
                          {firstGroup.title}
                        </h3>
                      </div>
                      <div className="h-3 w-px bg-border/50"></div>
                      <div className="flex items-center gap-1.5">
                        <div className={`flex items-center justify-center w-4 h-4 rounded bg-gradient-to-br ${secondGroup.color.split(' ')[0]} ${secondGroup.color.split(' ')[1]} shadow-sm`}>
                          <div className="text-foreground/70">
                            {secondGroup.icon}
                          </div>
                        </div>
                        <h3 className="text-[8px] sm:text-[9px] font-light text-foreground/70 uppercase tracking-wide">
                          {secondGroup.title}
                        </h3>
                      </div>
                      <div className="flex-1 h-px bg-border/50"></div>
                    </div>

                    {/* Combined Items Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                      {firstGroup.sections.map((section, sectionIndex) => (
                        <Link
                          key={`first-${sectionIndex}`}
                          href={section.href}
                          className={`group relative flex flex-col items-center justify-center bg-white dark:bg-card backdrop-blur-sm border-2 border-gray-300 dark:border-border rounded hover:-translate-y-1 hover:border-[#6366f1] dark:hover:border-[#A855F7] hover:bg-gradient-to-br hover:from-[#6366f1]/8 dark:hover:from-[#A855F7]/10 hover:to-transparent active:scale-95 transition-all duration-300 p-2 bg-gradient-to-br ${firstGroup.color.split(' ')[0]}/5`}
                        >
                          {/* Count Badge */}
                          {'count' in section && section.count !== undefined && section.count > 0 && (
                            <span className="absolute top-1 right-1 z-10 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 text-[9px] font-bold rounded-full bg-gradient-to-br from-[#6366f1] dark:from-[#A855F7] to-[#6366f1]/90 dark:to-[#A855F7]/90 text-white border border-white/80 dark:border-background shadow-md">
                              {section.count > 99 ? '99+' : section.count}
                            </span>
                          )}

                          {/* Icon Container */}
                          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gradient-to-br from-[#6366f1]/10 to-[#6366f1]/5 dark:from-[#A855F7]/20 dark:to-[#A855F7]/10 rounded group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-1 flex-shrink-0 shadow-sm group-hover:shadow-lg group-hover:shadow-[#6366f1]/20 dark:group-hover:shadow-[#A855F7]/20">
                            <div className="text-[#6366f1] dark:text-white text-sm sm:text-base">
                              {section.icon}
                            </div>
                          </div>

                          {/* Label */}
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-100 text-center leading-tight line-clamp-2 transition-all duration-300 group-hover:text-[#6366f1] dark:group-hover:text-[#A855F7]">
                            {section.label}
                          </span>

                          {/* Hover indicator line */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-12 h-0.5 bg-gradient-to-r from-transparent via-[#6366f1] dark:via-[#A855F7] to-transparent rounded-t-full transition-all duration-300"></div>
                        </Link>
                      ))}
                      {secondGroup.sections.map((section, sectionIndex) => (
                        <Link
                          key={`second-${sectionIndex}`}
                          href={section.href}
                          className={`group relative flex flex-col items-center justify-center bg-white dark:bg-card backdrop-blur-sm border-2 border-gray-300 dark:border-border rounded hover:-translate-y-1 hover:border-[#6366f1] dark:hover:border-[#A855F7] hover:bg-gradient-to-br hover:from-[#6366f1]/8 dark:hover:from-[#A855F7]/10 hover:to-transparent active:scale-95 transition-all duration-300 p-2 bg-gradient-to-br ${secondGroup.color.split(' ')[0]}/5`}
                        >
                          {/* Count Badge */}
                          {'count' in section && section.count !== undefined && section.count > 0 && (
                            <span className="absolute top-1 right-1 z-10 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 text-[9px] font-bold rounded-full bg-gradient-to-br from-[#6366f1] dark:from-[#A855F7] to-[#6366f1]/90 dark:to-[#A855F7]/90 text-white border border-white/80 dark:border-background shadow-md">
                              {section.count > 99 ? '99+' : section.count}
                            </span>
                          )}

                          {/* Icon Container */}
                          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gradient-to-br from-[#6366f1]/10 to-[#6366f1]/5 dark:from-[#A855F7]/20 dark:to-[#A855F7]/10 rounded group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-1 flex-shrink-0 shadow-sm group-hover:shadow-lg group-hover:shadow-[#6366f1]/20 dark:group-hover:shadow-[#A855F7]/20">
                            <div className="text-[#6366f1] dark:text-white text-sm sm:text-base">
                              {section.icon}
                            </div>
                          </div>

                          {/* Label */}
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-100 text-center leading-tight line-clamp-2 transition-all duration-300 group-hover:text-[#6366f1] dark:group-hover:text-[#A855F7]">
                            {section.label}
                          </span>

                          {/* Hover indicator line */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-12 h-0.5 bg-gradient-to-r from-transparent via-[#6366f1] dark:via-[#A855F7] to-transparent rounded-t-full transition-all duration-300"></div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              } else {
                // Single group - render normally
                const group = optimizedGroup.groups[0];
                return (
                  <div
                    key={optimizedIndex}
                    className={`border bg-gradient-to-br ${group.color} p-2 shadow-sm`}
                  >
                    {/* Group Header */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={`flex items-center justify-center w-4 h-4 rounded bg-gradient-to-br ${group.color.split(' ')[0]} ${group.color.split(' ')[1]} shadow-sm`}>
                        <div className="text-foreground/70">
                          {group.icon}
                        </div>
                      </div>
                      <h3 className="text-[8px] sm:text-[9px] font-light text-foreground/70 uppercase tracking-wide">
                        {group.title}
                      </h3>
                      <div className="flex-1 h-px bg-border/50"></div>
                    </div>

                    {/* Group Items Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                      {group.sections.map((section, sectionIndex) => (
                        <Link
                          key={sectionIndex}
                          href={section.href}
                          className={`group relative flex flex-col items-center justify-center bg-white dark:bg-card backdrop-blur-sm border-2 border-gray-300 dark:border-border rounded hover:-translate-y-1 hover:border-[#6366f1] dark:hover:border-[#A855F7] hover:bg-gradient-to-br hover:from-[#6366f1]/8 dark:hover:from-[#A855F7]/10 hover:to-transparent active:scale-95 transition-all duration-300 p-2 bg-gradient-to-br ${group.color.split(' ')[0]}/5`}
                        >
                          {/* Count Badge - Corner position */}
                          {'count' in section && section.count !== undefined && section.count > 0 && (
                            <span className="absolute top-1 right-1 z-10 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 text-[9px] font-bold rounded-full bg-gradient-to-br from-[#6366f1] dark:from-[#A855F7] to-[#6366f1]/90 dark:to-[#A855F7]/90 text-white border border-white/80 dark:border-background shadow-md">
                              {section.count > 99 ? '99+' : section.count}
                            </span>
                          )}

                          {/* Icon Container - Compact */}
                          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gradient-to-br from-[#6366f1]/10 to-[#6366f1]/5 dark:from-[#A855F7]/20 dark:to-[#A855F7]/10 rounded group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-1 flex-shrink-0 shadow-sm group-hover:shadow-lg group-hover:shadow-[#6366f1]/20 dark:group-hover:shadow-[#A855F7]/20">
                            <div className="text-[#6366f1] dark:text-white text-sm sm:text-base">
                              {section.icon}
                            </div>
                          </div>

                          {/* Label - Compact */}
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-100 text-center leading-tight line-clamp-2 transition-all duration-300 group-hover:text-[#6366f1] dark:group-hover:text-[#A855F7]">
                            {section.label}
                          </span>

                          {/* Hover indicator line */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-12 h-0.5 bg-gradient-to-r from-transparent via-[#6366f1] dark:via-[#A855F7] to-transparent rounded-t-full transition-all duration-300"></div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }
            });
          })()}
        </div>
      </div>
    </div>
  );
}

