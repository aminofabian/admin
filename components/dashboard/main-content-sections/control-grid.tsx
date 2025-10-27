'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';

export type ControlSection = 'companies' | 'players' | 'games' | 'managers' | 'agents' | 'staffs' | 'transactions' | 'processing' | 'bonuses' | 'banners' | 'affiliates' | 'support';

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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ), 
    label: 'Support',
    section: 'support'
  },
];

interface ControlGridProps {
  onSectionClick?: (section: ControlSection | undefined) => void;
  activeSection?: ControlSection | null;
}

export function ControlGrid({ onSectionClick, activeSection }: ControlGridProps) {
  const { user } = useAuth();
  
  // Filter control items based on user role
  const filteredItems = controlItems.filter(item => {
    // Hide Companies control for non-superadmin users
    if (item.section === 'companies' && user?.role !== USER_ROLES.SUPERADMIN) {
      return false;
    }
    return true;
  });

  const handleClick = (section: ControlSection | undefined) => {
    if (onSectionClick && section) {
      onSectionClick(section);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-card via-card to-card/95 p-3 sm:p-5 md:p-6 lg:p-6 xl:p-7 border border-border/50 shadow-lg backdrop-blur-sm overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,hsl(var(--primary)/0.05)_25%,hsl(var(--primary)/0.05)_50%,transparent_50%,transparent_75%,hsl(var(--primary)/0.05)_75%)] bg-[length:20px_20px]" />
      </div>
      
      {/* Header with enhanced styling */}
      <div className="relative flex items-center justify-between mb-3 sm:mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/60 rounded-full" />
          <h3 className="text-xs sm:text-base font-bold text-foreground">
            Quick Controls
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-primary/10 rounded-full border border-primary/20">
            <span className="text-[10px] sm:text-xs font-bold text-primary">
              {filteredItems.length}
            </span>
          </div>
        </div>
      </div>
      
      {/* 🎨 ADAPTIVE RESPONSIVE GRID - UNIFIED APPROACH */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-3 gap-2 sm:gap-2.5 md:gap-2 lg:gap-3 xl:gap-3">
        {filteredItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 md:p-2 lg:p-3 xl:p-4 transition-colors duration-200 min-h-[4.5rem] sm:min-h-[5rem] md:min-h-[4rem] lg:min-h-[5rem] xl:min-h-[5.5rem] ${
              activeSection === item.section
                ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-xl shadow-primary/20 border-2 border-primary/30'
                : 'bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-primary/8 hover:via-primary/12 hover:to-primary/16 border border-border/30 hover:border-primary/30 shadow-md hover:shadow-lg hover:shadow-primary/10'
            }`}
            title={item.label}
          >
            {/* Background Glow */}
            <div className={`absolute inset-0 transition-opacity duration-200 ${
              activeSection === item.section 
                ? 'bg-gradient-to-br from-primary/15 to-primary/5 opacity-100' 
                : 'bg-gradient-to-br from-primary/5 to-primary/2 opacity-0 group-hover:opacity-100'
            }`} />
            
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-7 md:h-7 lg:w-9 lg:h-9 xl:w-11 xl:h-11 flex items-center justify-center transition-colors duration-200 ${
                activeSection === item.section
                  ? 'bg-primary-foreground/20'
                  : 'bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10'
              }`}>
                <div className={`transition-colors duration-200 scale-75 sm:scale-90 md:scale-75 lg:scale-90 xl:scale-100 ${
                  activeSection === item.section
                    ? 'text-primary-foreground'
                    : 'text-primary'
                }`}>
                  {item.icon}
                </div>
              </div>
            </div>
            
            {/* Text with proper truncation */}
            <div className="relative w-full px-0.5">
              <span className={`block text-[10px] sm:text-[11px] md:text-[9px] lg:text-[10px] xl:text-xs font-bold transition-colors duration-200 text-center leading-snug line-clamp-2 ${
                activeSection === item.section
                  ? 'text-primary-foreground'
                  : 'text-foreground group-hover:text-primary'
              }`}>
                {item.label}
              </span>
            </div>
            
            {/* Notification Badge */}
            {(index === 10) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-[8px] sm:text-[9px] text-white font-bold flex items-center justify-center shadow-md">
                2
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Enhanced Footer */}
      <div className="relative mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-border/30">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] sm:text-[11px] text-muted-foreground/70 font-medium truncate">
            <span className="sm:hidden">Tap any control • {filteredItems.length}</span>
            <span className="hidden sm:inline">Click any control for quick access</span>
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            <div className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
            <div className="w-1.5 h-1.5 bg-primary/80 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
