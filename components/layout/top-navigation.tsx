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
    <div className="flex items-center justify-between px-4 lg:px-6 py-4 bg-card border-b border-border">
      {/* Left side - Mobile menu button and Time */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Time and Date */}
        <div className="flex flex-col">
          <span className="text-lg lg:text-2xl font-bold text-foreground">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs lg:text-sm text-muted-foreground hidden sm:block">
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
      <div className="flex items-center space-x-2 lg:space-x-4">
        {/* Theme Toggle */}
        <div className="flex items-center bg-accent rounded-full p-1">
          <button
            onClick={toggleTheme}
            className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Light
          </button>
          <button
            onClick={toggleTheme}
            className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dark
          </button>
        </div>

        {/* Notifications/Alerts */}
        <button 
          className="relative p-2 rounded-lg hover:bg-accent transition-colors"
          title="Notifications"
        >
          <svg className="w-4 lg:w-5 h-4 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Notification Badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* System Health (hidden on mobile) */}
        <button 
          className="hidden lg:block p-2 rounded-lg hover:bg-accent transition-colors"
          title="System Health"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2">
          <div className="w-6 lg:w-8 h-6 lg:h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-medium text-xs lg:text-sm">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-xs lg:text-sm font-medium text-foreground hidden sm:block">
            {user?.username || 'User'}
          </span>
        </div>
      </div>
    </div>
  );
}
