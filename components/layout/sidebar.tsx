'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { Logo } from '@/components/ui';
import { useState } from 'react';

interface SubMenuItem {
  name: string;
  href?: string;
  icon: React.ReactNode;
  submenu?: SubMenuItem[];
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

const PurchaseBonusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const RechargeBonusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const TransferBonusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const SignUpBonusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SocialLinksIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const PaymentSettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AffiliatesAgentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const AffiliatesDefaultIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);

const ProcessingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CashoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const PurchaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const GameActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HistoryTransactionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const HistoryGameActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
    name: 'History',
    icon: <HistoryIcon />,
    roles: Object.values(USER_ROLES),
    submenu: [
      { name: 'Transactions', href: '/dashboard/history/transactions', icon: <HistoryTransactionIcon /> },
      { name: 'Game Activities', href: '/dashboard/history/game-activities', icon: <HistoryGameActivityIcon /> },
    ],
  },
  {
    name: 'Processing',
    icon: <ProcessingIcon />,
    roles: Object.values(USER_ROLES),
    submenu: [
      { name: 'Cashout', href: '/dashboard/processing/cashout', icon: <CashoutIcon /> },
      { name: 'Purchase', href: '/dashboard/processing/purchase', icon: <PurchaseIcon /> },
      { name: 'Game Activities', href: '/dashboard/processing/game-activities', icon: <GameActivityIcon /> },
    ],
  },
  {
    name: 'Bonuses',
    icon: <BonusIcon />,
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY],
    submenu: [
      { name: 'Purchase Bonus', href: '/dashboard/bonuses/purchase', icon: <PurchaseBonusIcon /> },
      { name: 'Recharge Bonus', href: '/dashboard/bonuses/recharge', icon: <RechargeBonusIcon /> },
      { name: 'Transfer Bonus', href: '/dashboard/bonuses/transfer', icon: <TransferBonusIcon /> },
      { name: 'Sign Up Bonus', href: '/dashboard/bonuses/signup', icon: <SignUpBonusIcon /> },
    ],
  },
  {
    name: 'Settings',
    icon: <SettingsIcon />,
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY],
    submenu: [
      { name: 'Banners', href: '/dashboard/settings/banners', icon: <BannerIcon /> },
      { name: 'Social Links', href: '/dashboard/settings/social-links', icon: <SocialLinksIcon /> },
      { name: 'Payment Settings', href: '/dashboard/settings/payment', icon: <PaymentSettingsIcon /> },
    ],
  },
  {
    name: 'Affiliates',
    icon: <AffiliateIcon />,
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY, USER_ROLES.MANAGER],
    submenu: [
      { name: 'Agents', href: '/dashboard/agents', icon: <AffiliatesAgentIcon /> },
      { name: 'Affiliates', href: '/dashboard/affiliates', icon: <AffiliateIcon /> },
      { name: 'Default Settings', href: '/dashboard/settings/affiliate', icon: <AffiliatesDefaultIcon /> },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
}

function SubMenuItemComponent({ 
  item, 
  pathname, 
  onClose,
  isCollapsed,
  level = 1
}: { 
  item: SubMenuItem; 
  pathname: string; 
  onClose?: () => void;
  isCollapsed?: boolean;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubmenu = item.submenu && item.submenu.length > 0;
  const isActive = item.href && pathname === item.href;

  // Render link if it has href and no submenu
  if (!hasSubmenu && item.href) {
    return (
      <Link
        href={item.href || '#'}
        onClick={onClose}
        className={`group relative flex items-center gap-3 py-2.5 px-6 transition-all duration-200 rounded-md ${
          isActive
            ? 'bg-primary/10 dark:bg-primary/15 text-primary font-semibold shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
        }`}
        title={isCollapsed ? item.name : undefined}
      >
        <div className={`shrink-0 transition-all duration-200 ${
          isActive ? 'text-primary' : 'group-hover:text-primary'
        }`}>
          {item.icon}
        </div>
        <span className="block text-sm font-medium whitespace-nowrap">{item.name}</span>
      </Link>
    );
  }
  
  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group w-full flex items-center justify-between gap-3 py-2.5 px-6 transition-all duration-200 rounded-md ${
          isExpanded 
            ? 'bg-muted/80 text-foreground font-medium' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
        title={isCollapsed ? item.name : undefined}
      >
        <div className="flex items-center gap-3 relative z-10">
          <div className={`shrink-0 transition-all duration-200 ${
            isExpanded ? 'text-primary' : 'group-hover:text-primary'
          }`}>
            {item.icon}
          </div>
          <span className="block text-sm font-medium whitespace-nowrap">{item.name}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-all duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180 text-primary' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && item.submenu && (
        <div 
          className="ml-8 space-y-1 animate-in fade-in-0 slide-in-from-top-1 duration-200"
        >
          {item.submenu.map((subItem, index) => (
            <SubMenuItemComponent
              key={subItem.href || subItem.name}
              item={subItem}
              pathname={pathname}
              onClose={onClose}
              isCollapsed={isCollapsed}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
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
        className={`group relative flex items-center gap-3 py-3 px-6 text-sm font-medium transition-all duration-200 rounded-lg ${
          isActive
            ? 'bg-primary/10 text-primary font-semibold shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}
        title={isCollapsed ? category.name : undefined}
      >
        <div className={`shrink-0 transition-all duration-200 ${
          isActive ? 'text-primary' : 'group-hover:text-primary'
        }`}>
          {category.icon}
        </div>
        <span className="text-sm font-semibold whitespace-nowrap">{category.name}</span>
      </Link>
    );
  }

  // For collapsed state with submenu - show first item with href
  if (isCollapsed && hasSubmenu && category.submenu) {
    const firstItem = category.submenu.find(item => item.href);
    if (firstItem && firstItem.href) {
      return (
        <Link
          href={firstItem.href}
          onClick={onClose}
          className="group relative flex items-center justify-center md:justify-center xl:justify-start gap-3 px-3 md:px-2.5 xl:px-3 py-3 md:py-2.5 xl:py-3 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-gradient-to-r hover:from-accent/80 hover:to-accent/60 hover:shadow-md transition-all duration-300"
          title={category.name}
        >
          <div className="shrink-0 p-1.5 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
            {category.icon}
          </div>
          <span className="md:hidden xl:block truncate text-sm font-semibold tracking-wide">{category.name}</span>
        </Link>
      );
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group w-full flex items-center justify-between gap-3 py-3 px-6 text-sm font-medium transition-all duration-200 rounded-lg ${
          isExpanded 
            ? 'bg-primary/10 text-primary font-semibold' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}
        title={isCollapsed ? category.name : undefined}
      >
        <div className="flex items-center gap-3">
          <div className={`shrink-0 transition-all duration-200 ${
            isExpanded ? 'text-primary' : 'group-hover:text-primary'
          }`}>
            {category.icon}
          </div>
          <span className="text-sm font-semibold whitespace-nowrap">{category.name}</span>
        </div>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && category.submenu && (
        <div className="ml-4 space-y-1 pt-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {category.submenu.map((item, index) => (
            <SubMenuItemComponent
              key={item.href || item.name}
              item={item}
              pathname={pathname}
              onClose={onClose}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onClose, isCollapsed = false }: SidebarProps) {
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
    <aside className="w-full h-screen bg-gradient-to-b from-background via-background/98 to-background border-r border-border/50 flex flex-col">
      {/* Header */}
      <div className="relative p-6 flex items-center justify-between border-b border-border/50">
        <Logo 
          showText={true} 
          size="sm" 
          className="relative z-10"
        />
        <button
          onClick={onClose}
          className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors">
          <div className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {user?.username || 'Admin'}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {user?.role || 'SuperAdmin'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-0.5">
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

      {/* Footer */}
      <div className="border-t border-border/50 p-6 space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs font-medium text-green-600 dark:text-green-400">System Online</span>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-6 py-3 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
