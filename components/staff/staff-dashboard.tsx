'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import type { ReactNode } from 'react';

export function StaffDashboard() {
  const { counts: processingCounts } = useProcessingWebSocketContext();
  const [highlightedCategory, setHighlightedCategory] = useState<number | null>(null);

  // Grouped sections by category - similar to main dashboard
  const sectionGroups = [
    {
      title: 'User Management',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
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
      ],
    },
    {
      title: 'Games & Activities',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
      sections: [
        {
          label: 'Bonuses',
          href: '/dashboard/bonuses',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2v7m0 0v5a2 2 0 11-4 0v-5m4 0H9m3 0h3" />
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
      sections: [
        {
          label: 'Settings',
          href: '/dashboard/settings',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          label: 'Banners',
          href: '/dashboard/settings/banners',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          label: 'Payment',
          href: '/dashboard/settings/payment',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-120px)] space-y-1.5 pb-1.5">
      {/* Quick Access Sections - Mobile App Style with Grouping */}
      <div className="flex flex-col items-center space-y-1.5">
        <div className="w-full max-w-5xl px-3 sm:px-4">
          <div className="flex items-center gap-1.5 px-1">
            <div className="h-0.5 w-4 bg-primary rounded-full"></div>
            <h2 className="text-[8px] sm:text-[9px] font-light text-foreground/70">Quick Access</h2>
            <div className="flex-1 h-0.5 bg-border rounded-full"></div>
          </div>
        </div>

        <div className="w-full max-w-5xl px-3 sm:px-4">
          {(() => {
            // Create rows with exactly 5 items each by combining categories
            const rows: Array<{
              items: Array<{
                section: typeof sectionGroups[0]['sections'][0];
                categoryName: string;
                categoryIndex: number;
              }>;
            }> = [];

            sectionGroups.forEach((group, groupIdx) => {
              group.sections.forEach((section) => {
                // If current row is full or doesn't exist, create new one
                if (rows.length === 0 || rows[rows.length - 1].items.length >= 5) {
                  rows.push({ items: [] });
                }
                rows[rows.length - 1].items.push({
                  section,
                  categoryName: group.title,
                  categoryIndex: groupIdx,
                });
              });
            });

            // Color scheme for categories
            const categoryColors = [
              { border: 'border-blue-200/50 dark:border-blue-900/30', hoverBorder: 'hover:border-blue-500/50 dark:hover:border-blue-500/30', bg: 'from-blue-50/50 dark:from-blue-950/20', iconBg: 'from-blue-500/10 to-blue-600/5 dark:from-blue-400/20 dark:to-blue-500/10', text: 'text-blue-600 dark:text-blue-400', badge: 'from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500', shadow: 'group-hover:shadow-blue-500/20', glow: 'via-blue-500 dark:via-blue-400', headerBg: 'from-blue-500/20 to-blue-600/10', headerText: 'text-blue-600/70 dark:text-blue-400/70' },
              { border: 'border-purple-200/50 dark:border-purple-900/30', hoverBorder: 'hover:border-purple-500/50 dark:hover:border-purple-500/30', bg: 'from-purple-50/50 dark:from-purple-950/20', iconBg: 'from-purple-500/10 to-purple-600/5 dark:from-purple-400/20 dark:to-purple-500/10', text: 'text-purple-600 dark:text-purple-400', badge: 'from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500', shadow: 'group-hover:shadow-purple-500/20', glow: 'via-purple-500 dark:via-purple-400', headerBg: 'from-purple-500/20 to-purple-600/10', headerText: 'text-purple-600/70 dark:text-purple-400/70' },
              { border: 'border-emerald-200/50 dark:border-emerald-900/30', hoverBorder: 'hover:border-emerald-500/50 dark:hover:border-emerald-500/30', bg: 'from-emerald-50/50 dark:from-emerald-950/20', iconBg: 'from-emerald-500/10 to-emerald-600/5 dark:from-emerald-400/20 dark:to-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', badge: 'from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500', shadow: 'group-hover:shadow-emerald-500/20', glow: 'via-emerald-500 dark:via-emerald-400', headerBg: 'from-emerald-500/20 to-emerald-600/10', headerText: 'text-emerald-600/70 dark:text-emerald-400/70' },
              { border: 'border-amber-200/50 dark:border-amber-900/30', hoverBorder: 'hover:border-amber-500/50 dark:hover:border-amber-500/30', bg: 'from-amber-50/50 dark:from-amber-950/20', iconBg: 'from-amber-500/10 to-amber-600/5 dark:from-amber-400/20 dark:to-amber-500/10', text: 'text-amber-600 dark:text-amber-400', badge: 'from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500', shadow: 'group-hover:shadow-amber-500/20', glow: 'via-amber-500 dark:via-amber-400', headerBg: 'from-amber-500/20 to-amber-600/10', headerText: 'text-amber-600/70 dark:text-amber-400/70' },
              { border: 'border-rose-200/50 dark:border-rose-900/30', hoverBorder: 'hover:border-rose-500/50 dark:hover:border-rose-500/30', bg: 'from-rose-50/50 dark:from-rose-950/20', iconBg: 'from-rose-500/10 to-rose-600/5 dark:from-rose-400/20 dark:to-rose-500/10', text: 'text-rose-600 dark:text-rose-400', badge: 'from-rose-500 to-rose-600 dark:from-rose-400 dark:to-rose-500', shadow: 'group-hover:shadow-rose-500/20', glow: 'via-rose-500 dark:via-rose-400', headerBg: 'from-rose-500/20 to-rose-600/10', headerText: 'text-rose-600/70 dark:text-rose-400/70' },
              { border: 'border-cyan-200/50 dark:border-cyan-900/30', hoverBorder: 'hover:border-cyan-500/50 dark:hover:border-cyan-500/30', bg: 'from-cyan-50/50 dark:from-cyan-950/20', iconBg: 'from-cyan-500/10 to-cyan-600/5 dark:from-cyan-400/20 dark:to-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', badge: 'from-cyan-500 to-cyan-600 dark:from-cyan-400 dark:to-cyan-500', shadow: 'group-hover:shadow-cyan-500/20', glow: 'via-cyan-500 dark:via-cyan-400', headerBg: 'from-cyan-500/20 to-cyan-600/10', headerText: 'text-cyan-600/70 dark:text-cyan-400/70' },
              { border: 'border-violet-200/50 dark:border-violet-900/30', hoverBorder: 'hover:border-violet-500/50 dark:hover:border-violet-500/30', bg: 'from-violet-50/50 dark:from-violet-950/20', iconBg: 'from-violet-500/10 to-violet-600/5 dark:from-violet-400/20 dark:to-violet-500/10', text: 'text-violet-600 dark:text-violet-400', badge: 'from-violet-500 to-violet-600 dark:from-violet-400 dark:to-violet-500', shadow: 'group-hover:shadow-violet-500/20', glow: 'via-violet-500 dark:via-violet-400', headerBg: 'from-violet-500/20 to-violet-600/10', headerText: 'text-violet-600/70 dark:text-violet-400/70' },
            ];

            return rows.map((row, rowIndex) => {
              // Get unique categories in this row
              const uniqueCategories = Array.from(new Set(row.items.map(item => item.categoryIndex)));

              return (
                <div key={rowIndex} className="rounded-lg border border-gray-300 dark:border-slate-700 bg-background p-1.5 sm:p-2 mb-3 sm:mb-4">
                  {/* Row Header - Show all categories in this row */}
                  <div className="flex items-center gap-2 mb-1.5 overflow-hidden">
                    {uniqueCategories.map((catIdx) => {
                      const group = sectionGroups[catIdx];
                      const colors = categoryColors[catIdx % categoryColors.length];
                      const isHighlighted = highlightedCategory === catIdx;
                      return (
                        <button
                          key={catIdx}
                          onClick={() => setHighlightedCategory(isHighlighted ? null : catIdx)}
                          className={`flex items-center gap-1 flex-shrink-0 transition-all duration-200 ${isHighlighted ? 'scale-105' : 'hover:scale-102'}`}
                        >
                          <div className={`flex items-center justify-center w-3.5 h-3.5 rounded bg-gradient-to-br ${colors.headerBg} shadow-sm transition-all duration-200 ${isHighlighted ? 'ring-2 ring-offset-1 ' + colors.text.replace('text-', 'ring-') : ''}`}>
                            <div className={`${colors.headerText} text-[8px]`}>{group.icon}</div>
                          </div>
                          <h3 className={`text-[7px] sm:text-[8px] font-light ${colors.headerText} uppercase tracking-wide ${isHighlighted ? 'font-bold' : ''}`}>
                            {group.title}
                          </h3>
                        </button>
                      );
                    }).reduce<React.ReactNode[]>((acc, elem, index) => {
                      if (index === 0) return [elem];
                      return [...acc, <div key={`sep-${index}`} className="h-2.5 w-px bg-border/50 flex-shrink-0"></div>, elem];
                    }, [])}
                    <div className="flex-1 h-px bg-border/50 min-w-0"></div>
                  </div>

                  {/* Grid - 3 columns on mobile, 5 on larger screens */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-5 gap-1 sm:gap-1.5">
                    {row.items.map((item, itemIdx) => {
                      const colors = categoryColors[item.categoryIndex % categoryColors.length];
                      const section = item.section;
                      const isHighlighted = highlightedCategory === item.categoryIndex;
                      const isDimmed = highlightedCategory !== null && !isHighlighted;
                      return (
                        <Link
                          key={itemIdx}
                          href={section.href}
                          className={`group relative flex flex-col items-center justify-center border-2 ${colors.border} ${colors.hoverBorder} rounded-xl hover:bg-gradient-to-br active:scale-95 transition-all duration-300 p-3 sm:p-4 bg-gradient-to-br ${colors.bg} ${isDimmed ? 'opacity-30 scale-95' : ''} ${isHighlighted ? 'scale-105 ring-2 ring-offset-2 ' + colors.text.replace('text-', 'ring-') : ''}`}
                        >
                          {'count' in section && section.count !== undefined && section.count > 0 && (
                            <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center min-w-[0.95rem] h-3.5 px-0.5 text-[9px] font-medium rounded-full bg-gradient-to-br text-white border border-white/80 dark:border-background shadow-sm">
                              {section.count > 99 ? '99+' : section.count}
                            </span>
                          )}
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-br ${colors.iconBg} rounded group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-1.5 flex-shrink-0 shadow-sm ${colors.shadow}`}>
                            <div className={`${colors.text} text-sm sm:text-base`}>{section.icon}</div>
                          </div>
                          <span className={`text-[9px] sm:text-[10px] font-medium text-gray-700 dark:text-gray-100 text-center leading-tight line-clamp-2 group-hover:${colors.text.split(' ')[0].replace('600', '500').replace('400', '500')}`}>
                            {section.label}
                          </span>
                          <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-10 h-0.5 bg-gradient-to-r from-transparent ${colors.glow} to-transparent rounded-t-full transition-all duration-300`}></div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
