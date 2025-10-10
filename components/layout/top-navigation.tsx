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

      {/* Center - Navigation Icons (hidden on mobile) */}
      <div className="hidden lg:flex items-center space-x-6">
        {[
          { icon: '🏠', label: 'Home' },
          { icon: '🚗', label: 'Car' },
          { icon: '🎵', label: 'Music' },
          { icon: '📷', label: 'Camera' },
          { icon: '⚙️', label: 'Settings' },
        ].map((item) => (
          <button
            key={item.label}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title={item.label}
          >
            <span className="text-xl">{item.icon}</span>
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

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-accent transition-colors">
          <svg className="w-4 lg:w-5 h-4 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 1 15 0v5z" />
          </svg>
        </button>

        {/* Video Call (hidden on mobile) */}
        <button className="hidden lg:block p-2 rounded-lg hover:bg-accent transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
