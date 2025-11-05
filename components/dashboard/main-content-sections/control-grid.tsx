'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useChatDrawer } from '@/contexts/chat-drawer-context';

export type ControlSection = 'companies' | 'players' | 'games' | 'managers' | 'agents' | 'staffs' | 'transactions' | 'processing' | 'bonuses' | 'banners' | 'affiliates' | 'game-activities' | 'company-settings' | 'game-settings' | 'payment-settings' | 'social-links' | 'affiliate-settings';

interface ControlItem {
  icon: ReactNode;
  label: string;
  section?: ControlSection;
  active?: boolean;
}

const controlItems: ControlItem[] = [
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ), 
    label: 'Companies',
    section: 'companies'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ), 
    label: 'Players',
    section: 'players'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ), 
    label: 'Games',
    section: 'games'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), 
    label: 'Transactions',
    section: 'transactions'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ), 
    label: 'Processing',
    section: 'processing'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ), 
    label: 'Managers',
    section: 'managers'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ), 
    label: 'Agents',
    section: 'agents'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ), 
    label: 'Staffs',
    section: 'staffs'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ), 
    label: 'Bonuses',
    section: 'bonuses'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ), 
    label: 'Banners',
    section: 'banners'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ), 
    label: 'Affiliates',
    section: 'affiliates'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), 
    label: 'Game Activities',
    section: 'game-activities'
  },
  
  // Settings Quick Controls
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ), 
    label: 'Company Settings',
    section: 'company-settings'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ), 
    label: 'Game Settings',
    section: 'game-settings'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ), 
    label: 'Payment Settings',
    section: 'payment-settings'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ), 
    label: 'Support',
    section: undefined,
    active: true
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ), 
    label: 'Affiliate Settings',
    section: 'affiliate-settings'
  },
];

interface ControlGridProps {
  onSectionClick?: (section: ControlSection | undefined) => void;
  activeSection?: ControlSection | null;
}

export function ControlGrid({ onSectionClick, activeSection }: ControlGridProps) {
  const { user } = useAuth();
  const { openDrawer } = useChatDrawer();
  
  // Filter control items based on user role
  const filteredItems = controlItems.filter(item => {
    // Hide Companies control for non-superadmin users
    if (item.section === 'companies' && user?.role !== USER_ROLES.SUPERADMIN) {
      return false;
    }
    
    // Hide Company Settings for non-superadmin users
    if (item.section === 'company-settings' && user?.role !== USER_ROLES.SUPERADMIN) {
      return false;
    }
    
    return true;
  });

  const handleClick = (item: ControlItem) => {
    // Open chat drawer for Support button
    if (item.label === 'Support') {
      openDrawer();
      return;
    }
    
    // Open modals for all other sections
    if (onSectionClick && item.section) {
      onSectionClick(item.section);
    }
  };

  return (
    <div className="relative">
      {/* Creative Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Quick Actions
            </h3>
            <p className="text-xs text-muted-foreground">Instant access to key features</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
          <span className="text-sm font-bold text-primary">{filteredItems.length}</span>
          <span className="text-xs text-muted-foreground">items</span>
        </div>
      </div>

      {/* Main Grid Container - Mobile App Style */}
      <div className="grid grid-cols-3 lg:grid-cols-2 2xl:grid-cols-3 gap-2.5 sm:gap-3">
        {filteredItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item)}
            className={`group relative w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 lg:p-4 2xl:p-2.5 min-h-[85px] sm:min-h-[95px] lg:min-h-[110px] 2xl:min-h-[95px] rounded-2xl border transition-all duration-200 ${
              activeSection === item.section
                ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-white border-primary/50 shadow-xl shadow-primary/20'
                : 'bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-card hover:via-card/95 hover:to-card/90 border-border/30 hover:border-primary/30 shadow-md hover:shadow-lg'
            }`}
            title={item.label}
          >
            {/* Icon Container - Simple and Clean */}
            <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 2xl:w-8 2xl:h-8 flex items-center justify-center transition-all duration-200 ${
              activeSection === item.section
                ? 'opacity-100'
                : 'opacity-70 group-hover:opacity-100'
            }`}>
              <div className={`transition-all duration-200 w-4 h-4 sm:w-5 sm:h-5 lg:w-5 lg:h-5 2xl:w-4 2xl:h-4 ${
                activeSection === item.section
                  ? 'text-white'
                  : 'text-foreground'
              }`}>
                {item.icon}
              </div>
            </div>

            {/* Text Label - Centered */}
            <div className="w-full text-center px-1">
              <div className={`text-xs lg:text-sm 2xl:text-xs font-medium transition-colors duration-200 leading-tight line-clamp-2 ${
                activeSection === item.section
                  ? 'text-white'
                  : 'text-foreground'
              }`}>
                {item.label}
              </div>
            </div>

            {/* Active Indicator - Subtle Badge */}
            {activeSection === item.section && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-white/90 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <p className="text-xs text-muted-foreground">
              {filteredItems.length} quick actions available
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-primary/40 rounded-full" />
            <div className="w-1 h-1 bg-primary/60 rounded-full" />
            <div className="w-1 h-1 bg-primary/80 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
