'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import type { ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: (isActive: boolean) => ReactNode;
  isCenter?: boolean;
  countKey?: 'purchase_count' | 'cashout_count' | 'game_activities_count';
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { counts: processingCounts } = useProcessingWebSocketContext();

  const NAV_ITEMS: NavItem[] = [
    {
      href: '/dashboard/processing/purchase',
      label: 'Purchase',
      countKey: 'purchase_count',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/processing/cashout',
      label: 'Cashout',
      countKey: 'cashout_count',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      href: '/dashboard',
      label: 'Home',
      isCenter: true,
      icon: (isActive: boolean) => (
        <svg className="w-6 h-6" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/dashboard/processing/game-activities',
      label: 'Game Activity',
      countKey: 'game_activities_count',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/chat',
      label: 'Chat',
      icon: (isActive: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ];

  const getCount = (item: NavItem): number | undefined => {
    if (!item.countKey) return undefined;
    return processingCounts[item.countKey];
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      {/* Navigation items */}
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          // For processing routes, check if pathname starts with the href
          const isActive = item.href === '/dashboard' 
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          const isCenter = item.isCenter;

          const count = getCount(item);

          if (isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative group"
              >
                {/* Center button */}
                <div className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {/* Icon */}
                  <div className={`transition-all duration-300 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}>
                    {item.icon(isActive)}
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 py-2 px-3 group active:scale-95 transition-all duration-300"
            >
              {/* Icon Container */}
              <div className="relative">
                <div className={`transition-all duration-300 ${
                  isActive 
                    ? 'text-primary scale-110' 
                    : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'
                }`}>
                  {item.icon(isActive)}
                </div>
                {/* Count Badge */}
                {count !== undefined && count > 0 && (
                  <span className={`absolute -top-1 -right-1 z-10 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-[9px] font-bold rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-primary shadow-md'
                      : 'bg-red-500 text-white shadow-lg'
                  }`}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] font-medium transition-all duration-300 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
