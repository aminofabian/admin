'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import { USER_ROLES } from '@/lib/constants/roles';
import { useState, useEffect } from 'react';

interface TopNavigationProps {
  onMenuClick?: () => void;
}

export function TopNavigation({ onMenuClick }: TopNavigationProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const pathname = usePathname();
  const { counts: processingCounts } = useProcessingWebSocketContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="flex items-center justify-between px-3 sm:px-4 md:px-5 xl:px-6 py-3 sm:py-3.5 md:py-4 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm sticky top-0 z-20">
      {/* Left side - Mobile menu button and Time */}
      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
        {/* Mobile menu button - Enhanced */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        

        {/* Time and Date - Responsive sizing */}
        <div className="flex flex-col">
          <span className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold text-foreground tracking-tight">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden sm:block">
            {formatDate(currentTime)}
          </span>
        </div>
      </div>

      {/* Center - Quick Navigation (hidden on mobile) */}
      <div className="hidden lg:flex items-center space-x-1">
        {[
          { 
            href: '/dashboard',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ), 
            label: 'Dashboard',
            count: undefined
          },
          { 
            href: '/dashboard/processing/purchase',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 11H6L5 9z" />
              </svg>
            ), 
            label: 'Purchase Processing',
            count: processingCounts.purchase_count
          },
          { 
            href: '/dashboard/processing/cashout',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ), 
            label: 'Cashout Processing',
            count: processingCounts.cashout_count
          },
          { 
            href: '/dashboard/processing/game-activities',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ), 
            label: 'Game Activity Processing',
            count: processingCounts.game_activities_count
          },
          { 
            href: '/dashboard/chat',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ), 
            label: 'Chat',
            count: undefined,
            hideForSuperAdmin: true
          },
        ]
        .filter((item) => !(item.hideForSuperAdmin && user?.role === USER_ROLES.SUPERADMIN))
        .map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
              }`}
              title={item.label}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center mb-1.5">
                <div className={`flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/20'
                    : 'bg-transparent'
                }`}>
                  <div className={`transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}>
                    {item.icon}
                  </div>
                </div>
                {/* Count Badge - Positioned outside icon container */}
                {item.count !== undefined && item.count > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 z-10 inline-flex items-center justify-center h-4.5 min-w-[1.125rem] px-1 text-[9px] font-bold rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-red-500 text-white shadow-lg'
                  }`}>
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </div>
              {/* Label */}
              <span className={`text-[10px] leading-tight text-center transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground group-hover:text-foreground'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Right side - User Profile, Notifications, and Theme Toggle */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 xl:space-x-4">
        {/* Theme Toggle - Icon on mobile, toggle on desktop */}
        <button
          onClick={toggleTheme}
          className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        {/* Theme Toggle - Full on desktop */}
        <div className="hidden lg:flex items-center bg-accent/50 rounded-full p-0.5 md:p-1">
          <button
            onClick={toggleTheme}
            className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium transition-all duration-200 ${
              theme === 'light'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Light
          </button>
          <button
            onClick={toggleTheme}
            className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dark
          </button>
        </div>

        {/* Notifications/Alerts - Responsive sizing */}
        <button 
          className="relative p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
          title="Notifications"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Notification Badge - Animated */}
          <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-card"></span>
        </button>

        {/* System Health (hidden on small screens) */}
        <button 
          className="hidden xl:block p-2 rounded-lg hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
          title="System Health"
        >
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* User Profile - Enhanced responsive design */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-2.5 pl-1.5 sm:pl-2 md:pl-3 ml-1.5 sm:ml-2 md:ml-3 border-l border-border">
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-md ring-2 ring-primary/20">
            <span className="text-primary-foreground font-semibold text-xs sm:text-sm">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs md:text-sm font-semibold text-foreground leading-tight">
              {user?.username || 'User'}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize leading-tight hidden lg:block">
              {user?.role || 'Admin'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
