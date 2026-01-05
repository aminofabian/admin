'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import { useChatUsersContext } from '@/contexts/chat-users-context';
import { USER_ROLES } from '@/lib/constants/roles';
import { useState, useEffect, useMemo, useRef } from 'react';

interface TopNavigationProps {
  onMenuClick?: () => void;
}

export function TopNavigation({ onMenuClick }: TopNavigationProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const {
    counts: processingCounts,
    isConnected: wsConnected,
    isConnecting: wsConnecting,
    isUsingFallback: wsFallback,
    error: wsError
  } = useProcessingWebSocketContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Get chat users from shared context
  const { users: chatUsers, isConnected: chatConnected } = useChatUsersContext();

  // Calculate total unread count across all chat users
  const hasUnreadMessages = useMemo(() => {
    if (!chatUsers || chatUsers.length === 0) return false;
    return chatUsers.some((chatUser) => (chatUser.unreadCount ?? 0) > 0);
  }, [chatUsers]);

  const totalUnreadCount = useMemo(() => {
    if (!chatUsers || chatUsers.length === 0) return 0;
    return chatUsers.reduce((sum, chatUser) => sum + (chatUser.unreadCount ?? 0), 0);
  }, [chatUsers]);

  // Calculate total notification count
  const totalNotificationCount = useMemo(() => {
    let count = 0;
    if (totalUnreadCount > 0) count += totalUnreadCount;
    // Sum all pending processing items
    count += (processingCounts.purchase_count ?? 0);
    count += (processingCounts.cashout_count ?? 0);
    count += (processingCounts.game_activities_count ?? 0);
    if (!wsConnected && !wsConnecting) count += 1; // Connection issue
    return count;
  }, [totalUnreadCount, processingCounts, wsConnected, wsConnecting]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isNotificationOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isNotificationOpen, isUserMenuOpen]);

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
          ...(user?.role !== USER_ROLES.AGENT ? [
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
          ] : []),
          {
            href: '/dashboard/chat',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ),
            label: 'Chat',
            count: undefined,
            hiddenRoles: [USER_ROLES.SUPERADMIN, USER_ROLES.STAFF, USER_ROLES.AGENT]
          },
        ]
          .filter((item) => {
            // @ts-expect-error - Dynamic property check
            if (item.hideForSuperAdmin && user?.role === USER_ROLES.SUPERADMIN) return false;
            // @ts-expect-error - Dynamic property check
            if (item.hiddenRoles && user?.role && item.hiddenRoles.includes(user.role)) return false;
            return true;
          })
          .map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative flex flex-col items-center justify-center px-2.5 py-2 rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                  }`}
                title={item.label}
              >
                {/* Icon Container with Badge */}
                <div className="relative flex items-center justify-center mb-1.5">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 ${isActive
                    ? 'bg-primary/20'
                    : 'bg-transparent'
                    }`}>
                    <div className={`transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      }`}>
                      {item.icon}
                    </div>
                  </div>
                  {/* Count Badge - Positioned outside icon container */}
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 z-10 inline-flex items-center justify-center h-4.5 min-w-[1.125rem] px-1 text-[9px] font-bold rounded-full transition-all duration-200 ${isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-red-500 text-white shadow-lg'
                      }`}>
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                  {/* Red dot indicator for chat when there are unread messages */}
                  {item.href === '/dashboard/chat' && hasUnreadMessages && (
                    <span className="absolute -top-0.5 -right-0.5 z-10 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card shadow-sm" />
                  )}
                </div>
                {/* Label */}
                <span className={`text-[10px] leading-tight text-center transition-colors whitespace-nowrap ${isActive
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
            className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium transition-all duration-200 ${theme === 'light'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Light
          </button>
          <button
            onClick={toggleTheme}
            className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium transition-all duration-200 ${theme === 'dark'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Dark
          </button>
        </div>

        {/* Notifications/Alerts - Responsive sizing with dropdown */}
        {user?.role !== USER_ROLES.AGENT && (
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
              title="Notifications"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Notification Badge - Show count or pulse if there are notifications */}
              {totalNotificationCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 sm:top-0 sm:right-0 inline-flex items-center justify-center min-w-[1.125rem] h-4.5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-card shadow-lg animate-pulse">
                  {totalNotificationCount > 99 ? '99+' : totalNotificationCount}
                </span>
              ) : (
                <span className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 rounded-full ring-2 ring-card transition-colors ${wsConnected ? 'bg-green-500' : wsConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                  }`}></span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-xl z-50 max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1 rounded-md hover:bg-accent transition-colors"
                    aria-label="Close notifications"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content - Scrollable */}
                <div className="overflow-y-auto flex-1">
                  {/* WebSocket Connection Status */}
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' :
                          wsConnecting ? 'bg-yellow-500 animate-pulse' :
                            'bg-red-500'
                          }`}></div>
                        <span className="text-xs font-medium text-foreground">Processing WebSocket</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${wsConnected ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                        wsConnecting ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                          'bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}>
                        {wsConnected ? 'Connected' : wsConnecting ? 'Connecting...' : wsFallback ? 'Fallback Mode' : 'Disconnected'}
                      </span>
                    </div>
                    {wsError && (
                      <p className="text-xs text-muted-foreground mt-1 ml-4">{wsError}</p>
                    )}
                  </div>

                  {/* Chat Connection Status */}
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${chatConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                          }`}></div>
                        <span className="text-xs font-medium text-foreground">Chat WebSocket</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${chatConnected ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                        }`}>
                        {chatConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>

                  {/* Unread Messages */}
                  {totalUnreadCount > 0 && (
                    <Link
                      href="/dashboard/chat"
                      onClick={() => setIsNotificationOpen(false)}
                      className="block p-3 border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">New Messages</p>
                            <p className="text-xs text-muted-foreground">
                              {totalUnreadCount} unread {totalUnreadCount === 1 ? 'message' : 'messages'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                          {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                        </span>
                      </div>
                    </Link>
                  )}

                  {/* Processing Queue Notifications */}
                  {((processingCounts.purchase_count ?? 0) > 0 || (processingCounts.cashout_count ?? 0) > 0 || (processingCounts.game_activities_count ?? 0) > 0) && (
                    <div className="p-3 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Processing Queue</p>

                      {(processingCounts.purchase_count ?? 0) > 0 && (
                        <Link
                          href="/dashboard/processing/purchase"
                          onClick={() => setIsNotificationOpen(false)}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors mb-1"
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 11H6L5 9z" />
                            </svg>
                            <span className="text-xs text-foreground">Purchase Requests</span>
                          </div>
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full">
                            {processingCounts.purchase_count ?? 0}
                          </span>
                        </Link>
                      )}

                      {(processingCounts.cashout_count ?? 0) > 0 && (
                        <Link
                          href="/dashboard/processing/cashout"
                          onClick={() => setIsNotificationOpen(false)}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors mb-1"
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-xs text-foreground">Cashout Requests</span>
                          </div>
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
                            {processingCounts.cashout_count ?? 0}
                          </span>
                        </Link>
                      )}

                      {(processingCounts.game_activities_count ?? 0) > 0 && (
                        <Link
                          href="/dashboard/processing/game-activities"
                          onClick={() => setIsNotificationOpen(false)}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-xs text-foreground">Game Activities</span>
                          </div>
                          <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                            {processingCounts.game_activities_count ?? 0}
                          </span>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {totalNotificationCount === 0 && (
                    <div className="p-8 text-center">
                      <svg className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-muted-foreground">All caught up!</p>
                      <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {totalNotificationCount > 0 && (
                  <div className="p-3 border-t border-border bg-muted/30">
                    <Link
                      href="/dashboard"
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      View all notifications →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* System Health (hidden on small screens) */}
        <button
          className="hidden xl:block p-2 rounded-lg hover:bg-accent transition-all duration-200 hover:scale-105 active:scale-95"
          title="System Health"
        >
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* User Profile - Enhanced responsive design with mobile logout */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-2.5 pl-1.5 sm:pl-2 md:pl-3 ml-1.5 sm:ml-2 md:ml-3 border-l border-border hover:opacity-80 transition-opacity"
          >
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
            {/* Mobile dropdown indicator */}
            <svg
              className={`lg:hidden w-4 h-4 text-muted-foreground transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Mobile User Menu Dropdown */}
          {isUserMenuOpen && (
            <>
              {/* Backdrop overlay */}
              <div
                className="lg:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              {/* Dropdown menu */}
              <div className="lg:hidden absolute right-0 top-full mt-2 w-56 bg-background border-2 border-border rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 space-y-2">
                  {/* User info section */}
                  <div className="px-3 py-2.5 bg-muted/50 rounded-md border-b border-border/50">
                    <div className="text-sm font-bold text-foreground">
                      {user?.username || 'User'}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize mt-0.5">
                      {user?.role || 'Admin'}
                    </div>
                  </div>
                  {/* Logout button */}
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md transition-all duration-200 active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
