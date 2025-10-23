'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { Logo } from '@/components/ui';
import { useState } from 'react';

interface SubMenuItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface MenuCategory {
  name: string;
  icon: React.ReactNode;
  roles: string[];
  href?: string;
  submenu?: SubMenuItem[];
}

// Icon components
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const CompanyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ManagerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const AgentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const StaffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const PlayerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const GameIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TransactionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const BonusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BannerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const AffiliateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const MENU_CATEGORIES: MenuCategory[] = [
  {
    name: 'Dashboard',
    icon: <DashboardIcon />,
    roles: Object.values(USER_ROLES),
    href: '/dashboard',
  },
  {
    name: 'Companies',
    icon: <CompanyIcon />,
    roles: [USER_ROLES.SUPERADMIN],
    href: '/dashboard/companies',
  },
  {
    name: 'User Management',
    icon: <UsersIcon />,
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY, USER_ROLES.MANAGER, USER_ROLES.AGENT],
    submenu: [
      { name: 'Managers', href: '/dashboard/managers', icon: <ManagerIcon /> },
      { name: 'Agents', href: '/dashboard/agents', icon: <AgentIcon /> },
      { name: 'Staffs', href: '/dashboard/staffs', icon: <StaffIcon /> },
      { name: 'Players', href: '/dashboard/players', icon: <PlayerIcon /> },
    ],
  },
  {
    name: 'Games',
    icon: <GameIcon />,
    roles: Object.values(USER_ROLES),
    href: '/dashboard/games',
  },
  {
    name: 'Transactions',
    icon: <TransactionIcon />,
    roles: Object.values(USER_ROLES),
    href: '/dashboard/transactions',
  },
  {
    name: 'Bonuses',
    icon: <BonusIcon />,
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY],
    href: '/dashboard/bonuses',
  },
  {
    name: 'Banners',
    icon: <BannerIcon />,
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY],
    href: '/dashboard/banners',
  },
  {
    name: 'Affiliates',
    icon: <AffiliateIcon />,
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY, USER_ROLES.MANAGER],
    href: '/dashboard/affiliates',
  },
];

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
}

function MenuItem({ 
  category, 
  pathname, 
  onClose,
  isCollapsed 
}: { 
  category: MenuCategory; 
  pathname: string; 
  onClose?: () => void;
  isCollapsed?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubmenu = category.submenu && category.submenu.length > 0;
  const isActive = category.href && pathname === category.href;

  if (!hasSubmenu && category.href) {
    return (
      <Link
        href={category.href}
        onClick={onClose}
        className={`group relative flex items-center justify-center md:justify-center xl:justify-start gap-3 px-4 md:px-3 xl:px-4 py-2.5 md:py-2 xl:py-2.5 text-sm font-medium transition-all duration-300 rounded-lg ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[0.98]'
            : 'text-foreground/80 hover:text-foreground hover:bg-accent/60 hover:shadow-sm hover:scale-[0.99]'
        }`}
        title={isCollapsed ? category.name : undefined}
      >
        <span className="shrink-0 transition-transform group-hover:scale-110">
          {category.icon}
        </span>
        <span className="md:hidden xl:block truncate text-sm font-medium">{category.name}</span>
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
        )}
      </Link>
    );
  }

  // For collapsed state with submenu - show first item
  if (isCollapsed && hasSubmenu && category.submenu) {
    const firstItem = category.submenu[0];
    return (
      <Link
        href={firstItem.href}
        onClick={onClose}
        className="group relative flex items-center justify-center md:justify-center xl:justify-start gap-3 px-4 md:px-3 xl:px-4 py-2.5 md:py-2 xl:py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent/60 hover:shadow-sm hover:scale-[0.99] transition-all duration-300 rounded-lg"
        title={category.name}
      >
        <span className="shrink-0 transition-transform group-hover:scale-110">
          {category.icon}
        </span>
        <span className="md:hidden xl:block truncate text-sm font-medium">{category.name}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group w-full flex items-center justify-center md:justify-center xl:justify-between gap-3 px-4 md:px-3 xl:px-4 py-2.5 md:py-2 xl:py-2.5 text-sm font-medium transition-all duration-300 rounded-lg ${
          isExpanded 
            ? 'bg-accent/70 text-foreground shadow-sm' 
            : 'text-foreground/80 hover:text-foreground hover:bg-accent/60 hover:shadow-sm hover:scale-[0.99]'
        }`}
        title={isCollapsed ? category.name : undefined}
      >
        <div className="flex items-center justify-center md:justify-center xl:justify-start gap-3">
          <span className="shrink-0 transition-transform group-hover:scale-110">
            {category.icon}
          </span>
          <span className="md:hidden xl:block truncate text-sm font-medium">{category.name}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-all duration-300 md:hidden xl:block ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && category.submenu && (
        <div className="space-y-1 pl-0 md:pl-0 xl:pl-3 pt-1">
          {category.submenu.map((item) => {
            const isSubActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center justify-center md:justify-center xl:justify-start gap-2.5 px-4 md:px-3 xl:px-3.5 py-2 md:py-1.5 xl:py-2 text-sm transition-all duration-300 rounded-lg border-l-2 ${
                  isSubActive
                    ? 'bg-primary/10 text-primary font-medium border-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent hover:border-accent'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <span className="shrink-0 transition-transform group-hover:scale-110">
                  {item.icon}
                </span>
                <span className="md:hidden xl:block truncate text-sm">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onClose, isCollapsed = true }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredCategories = user 
    ? MENU_CATEGORIES.filter((cat) => cat.roles.includes(user.role))
    : MENU_CATEGORIES;

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  return (
    <aside className="w-full h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-3 xl:p-4 flex items-center justify-center md:justify-center xl:justify-between border-b border-border/50 bg-gradient-to-r from-background to-accent/10">
        <Logo 
          showText={true} 
          size="sm" 
          className="md:scale-75 xl:scale-85"
        />
        <button
          onClick={onClose}
          className="md:hidden p-2 hover:bg-accent/80 active:bg-accent transition-all duration-200 rounded-lg absolute right-3 top-3 hover:rotate-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-3 md:p-2.5 xl:p-3">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-3 md:p-2.5 xl:p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center md:flex-col md:gap-2 xl:flex-row xl:gap-3">
            <div className="w-10 h-10 md:w-9 md:h-9 xl:w-10 xl:h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shrink-0 ring-2 ring-primary/20">
              <span className="text-primary-foreground font-bold text-sm md:text-xs xl:text-sm">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 md:text-center xl:text-left min-w-0">
              <div className="font-semibold text-foreground text-sm md:text-xs xl:text-sm truncate">
                {user?.username || 'Admin'}
              </div>
              <div className="text-muted-foreground capitalize text-xs md:text-[10px] xl:text-xs flex items-center md:justify-center xl:justify-start gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0 animate-pulse"></span>
                <span className="truncate">{user?.role || 'SuperAdmin'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {filteredCategories.map((category) => (
          <MenuItem
            key={category.name}
            category={category}
            pathname={pathname}
            onClose={onClose}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Footer Section */}
      <div className="border-t border-border/50 bg-gradient-to-t from-accent/20 to-transparent p-3 md:p-2.5 xl:p-3 space-y-3">
        <div className="text-xs md:text-center xl:text-left space-y-1.5">
          <div className="flex items-center md:flex-col md:gap-1 xl:flex-row xl:justify-between text-muted-foreground">
            <span className="font-medium text-[10px] md:text-[9px] xl:text-[10px]">Status</span>
            <span className="flex items-center text-green-500 text-[10px] md:text-[9px] xl:text-[10px] gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0 shadow-sm shadow-green-500/50"></span>
              <span className="font-medium">Online</span>
            </span>
          </div>
          <div className="text-muted-foreground/80 text-[9px] md:text-[8px] xl:text-[9px] md:hidden xl:block">
            v2.1.4 • Updated 2h ago
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="group w-full flex items-center justify-center md:justify-center xl:justify-start gap-2.5 px-3 py-2.5 md:py-2 xl:py-2.5 text-sm font-medium text-destructive hover:text-destructive-foreground hover:bg-destructive transition-all duration-300 rounded-lg border border-destructive/30 hover:border-destructive shadow-sm hover:shadow-md active:scale-95"
          title="Logout"
        >
          <svg 
            className="w-4 h-4 md:w-3.5 md:h-3.5 xl:w-4 xl:h-4 shrink-0 transition-transform group-hover:translate-x-0.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
            />
          </svg>
          <span className="md:hidden xl:block text-sm font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
