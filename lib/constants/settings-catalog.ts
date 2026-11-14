import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Disc3,
  Gamepad2,
  Mail,
  Megaphone,
  Phone,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react';
import { USER_ROLES, type UserRole } from '@/lib/constants/roles';

export type SettingGroupId = 'platform' | 'games' | 'payments' | 'players' | 'growth' | 'email';

export interface SettingGroup {
  id: SettingGroupId;
  title: string;
}

export interface SettingItem {
  id: string;
  title: string;
  description: string;
  href: string;
  group: SettingGroupId;
  roles: UserRole[];
  icon: LucideIcon;
}

const { SUPERADMIN, COMPANY, MANAGER, STAFF } = USER_ROLES;

export const SETTING_GROUPS: SettingGroup[] = [
  { id: 'platform', title: 'Platform' },
  { id: 'games', title: 'Games' },
  { id: 'payments', title: 'Payments' },
  { id: 'players', title: 'Players' },
  { id: 'growth', title: 'Referrals' },
  { id: 'email', title: 'Email' },
];

export const SETTING_ITEMS: SettingItem[] = [
  { id: 'company', title: 'Company settings', description: 'Domains, logos, admins, and services', href: '/dashboard/settings/company', group: 'platform', roles: [SUPERADMIN], icon: Building2 },
  { id: 'games', title: 'Game settings', description: 'Minimum redeem multiplier', href: '/dashboard/settings/games', group: 'games', roles: [COMPANY, SUPERADMIN], icon: Gamepad2 },
  { id: 'payment', title: 'Payment methods', description: 'Purchase and cashout methods per company', href: '/dashboard/settings/payment', group: 'payments', roles: [COMPANY, SUPERADMIN], icon: CreditCard },
  { id: 'cashout-24h', title: '24-hour cashout limit', description: 'Rolling 24-hour cashout cap', href: '/dashboard/settings/cashout-24h', group: 'payments', roles: [COMPANY, SUPERADMIN, MANAGER], icon: Clock },
  { id: 'bonuses', title: 'Bonuses', description: 'Purchase, recharge, transfer, and signup bonuses', href: '/dashboard/settings/bonuses', group: 'players', roles: [COMPANY, SUPERADMIN], icon: CircleDollarSign },
  { id: 'verification', title: 'Verification', description: 'Phone OTP and identity checks', href: '/dashboard/settings/verification', group: 'players', roles: [COMPANY, SUPERADMIN], icon: Phone },
  { id: 'roulette', title: 'Prize wheel', description: 'Daily free spins and wheel rewards', href: '/dashboard/settings/roulette', group: 'players', roles: [COMPANY, SUPERADMIN], icon: Disc3 },
  { id: 'referral', title: 'Referral program', description: 'Turn referrals on or off and set rewards', href: '/dashboard/settings/referral', group: 'growth', roles: [COMPANY, SUPERADMIN], icon: UserPlus },
  { id: 'referral-promo-codes', title: 'Promo codes', description: 'Custom signup codes', href: '/dashboard/settings/referral-promo-codes', group: 'growth', roles: [COMPANY, SUPERADMIN, MANAGER], icon: Tag },
  { id: 'affiliate', title: 'Affiliate defaults', description: 'Default commission and fees', href: '/dashboard/settings/affiliate', group: 'growth', roles: [COMPANY, SUPERADMIN], icon: Users },
  { id: 'email-templates', title: 'Email templates', description: 'Automatic emails sent to players', href: '/dashboard/settings/email-templates', group: 'email', roles: [COMPANY, MANAGER, STAFF], icon: Mail },
  { id: 'email-broadcasts', title: 'Email campaigns', description: 'Compose and schedule broadcasts', href: '/dashboard/settings/email-broadcasts', group: 'email', roles: [COMPANY, MANAGER, STAFF], icon: Megaphone },
];
