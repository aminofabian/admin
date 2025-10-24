'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';

export type ControlSection = 'companies' | 'players' | 'games' | 'managers' | 'agents' | 'staffs' | 'transactions' | 'bonuses' | 'banners' | 'affiliates' | 'support';

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
  
  // Priority system: show most important controls first
  const priorityItems = filteredItems.slice(0, 8); // Top 8 for small screens
  const allItems = filteredItems;

  const handleClick = (section: ControlSection | undefined) => {
    if (onSectionClick && section) {
      onSectionClick(section);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-card via-card to-card/95 rounded-2xl p-4 sm:p-5 md:p-6 lg:p-6 xl:p-7 border border-border/50 shadow-lg backdrop-blur-sm overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,hsl(var(--primary)/0.05)_25%,hsl(var(--primary)/0.05)_50%,transparent_50%,transparent_75%,hsl(var(--primary)/0.05)_75%)] bg-[length:20px_20px]" />
      </div>
      
      {/* Header with enhanced styling */}
      <div className="relative flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/60 rounded-full" />
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            Quick Controls
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-primary/10 rounded-full border border-primary/20">
            <span className="text-xs font-bold text-primary">
              {allItems.length}
            </span>
          </div>
        </div>
      </div>
      
      {/* 🎨 ENHANCED RESPONSIVE GRID SYSTEM */}
      
      {/* Mobile: Premium Card Design */}
      <div className="grid sm:hidden grid-cols-2 gap-3">
        {priorityItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center p-5 rounded-2xl transition-colors duration-200 ${
              activeSection === item.section
                ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-2xl shadow-primary/25 border-2 border-primary/30'
                : 'bg-gradient-to-br from-card via-card/95 to-card/90 hover:from-primary/5 hover:via-primary/10 hover:to-primary/15 border border-border/40 hover:border-primary/30 shadow-lg hover:shadow-xl hover:shadow-primary/10'
            }`}
            title={item.label}
          >
            {/* Static Background Glow */}
            <div className={`absolute inset-0 rounded-2xl ${
              activeSection === item.section 
                ? 'bg-gradient-to-br from-primary/20 to-primary/10 opacity-100' 
                : 'bg-gradient-to-br from-primary/5 to-primary/2 opacity-0 group-hover:opacity-100'
            }`} />
            
            <div className="relative flex flex-col items-center gap-3 w-full">
              {/* Enhanced Icon Container */}
              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200 ${
                activeSection === item.section
                  ? 'bg-primary-foreground/20'
                  : 'bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/25 group-hover:to-primary/10'
              }`}>
                <div className={`transition-colors duration-200 ${
                  activeSection === item.section
                    ? 'text-primary-foreground'
                    : 'text-primary group-hover:text-primary'
                }`}>
                  {item.icon}
                </div>
                
                {/* Static Ring */}
                <div className={`absolute inset-0 rounded-2xl border-2 transition-colors duration-200 ${
                  activeSection === item.section
                    ? 'border-primary-foreground/30'
                    : 'border-primary/20 group-hover:border-primary/40'
                }`} />
              </div>
              
              {/* Enhanced Text */}
              <div className="text-center w-full">
                <div className={`text-sm font-semibold transition-colors duration-200 leading-tight ${
                  activeSection === item.section
                    ? 'text-primary-foreground'
                    : 'text-foreground group-hover:text-primary'
                }`}>
                  {item.label}
                </div>
              </div>
            </div>
            
            {/* Static Notification Badge */}
            {(index === 10) && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-[10px] text-white font-bold flex items-center justify-center shadow-lg ring-2 ring-card">
                2
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tablet: Sleek Grid */}
      <div className="hidden sm:grid md:hidden grid-cols-3 gap-3">
        {allItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors duration-200 aspect-square ${
              activeSection === item.section
                ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-xl shadow-primary/20 border-2 border-primary/30'
                : 'bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-primary/8 hover:via-primary/12 hover:to-primary/18 border border-border/30 hover:border-primary/25 shadow-md hover:shadow-lg hover:shadow-primary/10'
            }`}
            title={item.label}
          >
            <div className={`transition-colors duration-200 ${
              activeSection === item.section
                ? 'text-primary-foreground'
                : 'text-primary group-hover:text-primary'
            }`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold transition-colors duration-200 text-center leading-tight px-1 ${
              activeSection === item.section
                ? 'text-primary-foreground'
                : 'text-foreground group-hover:text-primary'
            }`}>
              {item.label}
            </span>
            {(index === 10) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-[8px] text-white font-bold flex items-center justify-center shadow-md">
                2
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Medium Laptop: Compact Elegance */}
      <div className="hidden md:grid lg:hidden grid-cols-5 gap-2.5">
        {allItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-colors duration-200 min-h-[4rem] ${
              activeSection === item.section
                ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-gradient-to-br from-card/90 via-card/85 to-card/80 hover:from-primary/6 hover:via-primary/10 hover:to-primary/15 border border-border/20 hover:border-primary/20 shadow-sm hover:shadow-md hover:shadow-primary/5'
            }`}
            title={item.label}
          >
            <div className={`transition-colors duration-200 scale-90 ${
              activeSection === item.section
                ? 'text-primary-foreground'
                : 'text-primary group-hover:text-primary'
            }`}>
              {item.icon}
            </div>
            <span className={`text-[9px] font-bold transition-colors duration-200 text-center leading-tight px-0.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-full ${
              activeSection === item.section
                ? 'text-primary-foreground'
                : 'text-foreground group-hover:text-primary'
            }`}>
              {item.label}
            </span>
            {(index === 3 || index === 10) && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-[7px] text-white font-bold flex items-center justify-center shadow-md">
                {index === 3 ? '5' : '2'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Large Laptop: Balanced Design */}
      <div className="hidden lg:grid xl:hidden grid-cols-4 gap-3">
        {allItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors duration-200 min-h-[4.5rem] ${
              activeSection === item.section
                ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-xl shadow-primary/25'
                : 'bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-primary/8 hover:via-primary/12 hover:to-primary/18 border border-border/25 hover:border-primary/25 shadow-md hover:shadow-lg hover:shadow-primary/10'
            }`}
            title={item.label}
          >
            <div className={`transition-colors duration-200 ${
              activeSection === item.section
                ? 'text-primary-foreground'
                : 'text-primary group-hover:text-primary'
            }`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold transition-colors duration-200 text-center leading-tight px-1 overflow-hidden text-ellipsis whitespace-nowrap max-w-full ${
              activeSection === item.section
                ? 'text-primary-foreground'
                : 'text-foreground group-hover:text-primary'
            }`}>
              {item.label}
            </span>
            {(index === 10) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-[8px] text-white font-bold flex items-center justify-center shadow-md">
                2
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Large Desktop: Premium Spacing */}
      <div className="hidden xl:grid grid-cols-3 gap-4">
        {allItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl transition-colors duration-200 min-h-[5rem] ${
              activeSection === item.section
                ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-2xl shadow-primary/30 border-2 border-primary/30'
                : 'bg-gradient-to-br from-card/95 via-card/90 to-card/85 hover:from-primary/10 hover:via-primary/15 hover:to-primary/20 border border-border/30 hover:border-primary/30 shadow-lg hover:shadow-xl hover:shadow-primary/15'
            }`}
            title={item.label}
          >
            <div className={`transition-colors duration-200 scale-110 ${
              activeSection === item.section
                ? 'text-primary-foreground'
                : 'text-primary group-hover:text-primary'
            }`}>
              {item.icon}
            </div>
            <span className={`text-xs font-bold transition-colors duration-200 text-center leading-tight px-1 ${
              activeSection === item.section
                ? 'text-primary-foreground'
                : 'text-foreground group-hover:text-primary'
            }`}>
              {item.label}
            </span>
            {(index === 10) && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-[9px] text-white font-bold flex items-center justify-center shadow-lg">
                2
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Enhanced Footer */}
      <div className="relative mt-4 sm:mt-5 pt-4 border-t border-border/30">
        <div className="flex items-center justify-between">
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 font-medium">
            <span className="sm:hidden">Tap any control • Showing {priorityItems.length}/{allItems.length}</span>
            <span className="hidden sm:inline">Click any control for quick access</span>
          </p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            <div className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
            <div className="w-1.5 h-1.5 bg-primary/80 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
