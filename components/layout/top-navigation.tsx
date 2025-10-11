'use client';

import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { useState, useEffect } from 'react';

interface TopNavigationProps {
  onMenuClick?: () => void;
}

export function TopNavigation({ onMenuClick }: TopNavigationProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
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
          className="md:hidden p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
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
      <div className="hidden lg:flex items-center space-x-2">
        {[
          { 
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ), 
            label: 'Dashboard' 
          },
          { 
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            ), 
            label: 'Games' 
          },
          { 
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ), 
            label: 'Players' 
          },
          { 
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            ), 
            label: 'Transactions' 
          },
          { 
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ), 
            label: 'Reports' 
          },
        ].map((item) => (
          <button
            key={item.label}
            className="group flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent transition-all duration-200"
            title={item.label}
          >
            <div className="text-muted-foreground group-hover:text-foreground transition-colors">
              {item.icon}
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground mt-1 transition-colors">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Right side - User Profile, Notifications, and Theme Toggle */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 xl:space-x-4">
        {/* Theme Toggle - Icon on mobile, toggle on desktop */}
        <button
          onClick={toggleTheme}
          className="md:hidden p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
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
        <div className="hidden md:flex items-center bg-accent/50 rounded-full p-0.5 md:p-1">
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
            <span className="text-[10px] text-muted-foreground capitalize leading-tight hidden md:block">
              {user?.role || 'Admin'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
