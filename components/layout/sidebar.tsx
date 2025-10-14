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
  icon: string;
}

interface MenuCategory {
  name: string;
  icon: string;
  roles: string[];
  href?: string;
  submenu?: SubMenuItem[];
}

const MENU_CATEGORIES: MenuCategory[] = [
  {
    name: 'Dashboard',
    icon: '📊',
    roles: Object.values(USER_ROLES),
    href: '/dashboard',
  },
  {
    name: 'Companies',
    icon: '🏢',
    roles: [USER_ROLES.SUPERADMIN],
    href: '/dashboard/companies',
  },
  {
    name: 'User Management',
    icon: '👥',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY, USER_ROLES.MANAGER, USER_ROLES.AGENT],
    submenu: [
      { name: 'Managers', href: '/dashboard/managers', icon: '👨‍💼' },
      { name: 'Agents', href: '/dashboard/agents', icon: '🤝' },
      { name: 'Staffs', href: '/dashboard/staffs', icon: '👔' },
      { name: 'Players', href: '/dashboard/players', icon: '🎮' },
    ],
  },
  {
    name: 'Games',
    icon: '🎯',
    roles: Object.values(USER_ROLES),
    href: '/dashboard/games',
  },
  {
    name: 'Transactions',
    icon: '💳',
    roles: Object.values(USER_ROLES),
    href: '/dashboard/transactions',
  },
  {
    name: 'Bonuses',
    icon: '🎁',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY],
    href: '/dashboard/bonuses',
  },
  {
    name: 'Banners',
    icon: '🖼️',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY],
    href: '/dashboard/banners',
  },
  {
    name: 'Affiliates',
    icon: '🔗',
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
        className={`group relative flex items-center justify-center md:justify-center xl:justify-start gap-2 px-3 md:px-2 xl:px-2.5 py-1 md:py-0.5 xl:py-0.5 text-sm font-medium transition-all duration-200 rounded-md mx-1.5 md:mx-1 xl:mx-1.5 ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-foreground hover:bg-accent/80'
        }`}
        title={isCollapsed ? category.name : undefined}
      >
        <span className="text-base md:text-lg xl:text-base shrink-0">{category.icon}</span>
        <span className="md:hidden xl:block truncate text-[13px]">{category.name}</span>
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
        className="group relative flex items-center justify-center md:justify-center xl:justify-start gap-2 px-3 md:px-2 xl:px-2.5 py-1 md:py-0.5 xl:py-0.5 text-sm font-medium text-foreground hover:bg-accent/80 transition-all duration-200 rounded-md mx-1.5 md:mx-1 xl:mx-1.5"
        title={category.name}
      >
        <span className="text-base md:text-lg xl:text-base shrink-0">{category.icon}</span>
        <span className="md:hidden xl:block truncate text-[13px]">{category.name}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center md:justify-center xl:justify-between gap-2 px-3 md:px-2 xl:px-2.5 py-1 md:py-0.5 xl:py-0.5 text-sm font-medium text-foreground hover:bg-accent/80 transition-all duration-200 rounded-md mx-1.5 md:mx-1 xl:mx-1.5"
        title={isCollapsed ? category.name : undefined}
      >
        <div className="flex items-center justify-center md:justify-center xl:justify-start gap-2">
          <span className="text-base md:text-lg xl:text-base shrink-0">{category.icon}</span>
          <span className="md:hidden xl:block truncate text-[13px]">{category.name}</span>
        </div>
        <svg
          className={`w-3 h-3 transition-transform duration-200 md:hidden xl:block ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && category.submenu && (
        <div className="space-y-0 pl-0 md:pl-0 xl:pl-2.5">
          {category.submenu.map((item) => {
            const isSubActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-center md:justify-center xl:justify-start gap-2 px-3 md:px-2 xl:px-2.5 py-0.5 md:py-0.5 xl:py-0.5 text-sm transition-all duration-200 rounded-md mx-1.5 md:mx-1 xl:mx-1.5 ${
                  isSubActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <span className="text-sm md:text-base xl:text-sm shrink-0">{item.icon}</span>
                <span className="md:hidden xl:block truncate text-[12px]">{item.name}</span>
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
      <div className="p-1.5 md:p-1 xl:p-1.5 flex items-center justify-center md:justify-center xl:justify-between border-b border-border">
        <Logo 
          showText={true} 
          size="sm" 
          className="md:scale-75 xl:scale-85"
        />
        <button
          onClick={onClose}
          className="md:hidden p-1.5 hover:bg-accent transition-colors rounded-lg absolute right-2 top-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-1.5 md:p-1 xl:p-1.5">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-md p-1.5 md:p-1 xl:p-1.5">
          <div className="flex items-center md:flex-col md:gap-1 xl:flex-row xl:gap-1.5">
            <div className="w-7 h-7 md:w-6 md:h-6 xl:w-7 xl:h-7 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0">
              <span className="text-primary-foreground font-semibold text-xs md:text-[10px] xl:text-xs">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 md:text-center xl:text-left min-w-0">
              <div className="font-semibold text-foreground text-[11px] md:text-[9px] xl:text-[11px] truncate">
                {user?.username || 'Admin'}
              </div>
              <div className="text-muted-foreground capitalize text-[9px] md:text-[7px] xl:text-[9px] flex items-center md:justify-center xl:justify-start gap-0.5">
                <span className="w-1 h-1 bg-green-500 rounded-full shrink-0"></span>
                <span className="truncate">{user?.role || 'SuperAdmin'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-0.5">
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
      <div className="border-t border-border bg-accent/30 p-1.5 md:p-1 xl:p-1.5 space-y-1">
        <div className="text-xs md:text-center xl:text-left space-y-0.5">
          <div className="flex items-center md:flex-col md:gap-0 xl:flex-row xl:justify-between text-muted-foreground">
            <span className="font-medium text-[8px] md:text-[7px] xl:text-[8px]">Status</span>
            <span className="flex items-center text-green-500 text-[8px] md:text-[7px] xl:text-[8px] gap-0.5">
              <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse shrink-0"></span>
              <span className="font-medium">Online</span>
            </span>
          </div>
          <div className="text-muted-foreground/80 text-[7px] md:text-[6px] xl:text-[7px] md:hidden xl:block">
            v2.1.4 • 2h ago
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center md:justify-center xl:justify-start gap-2 px-2 py-1.5 md:py-1 xl:py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-md border border-destructive/20 hover:border-destructive/40"
          title="Logout"
        >
          <svg 
            className="w-4 h-4 md:w-3.5 md:h-3.5 xl:w-4 xl:h-4 shrink-0" 
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
          <span className="md:hidden xl:block text-[12px] font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
