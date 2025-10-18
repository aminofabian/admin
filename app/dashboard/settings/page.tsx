'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsCategories = [
  {
    id: 'company',
    title: 'Company Settings',
    description: 'Manage company/whitelabel settings and configurations',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    href: '/dashboard/settings/company',
    permissions: ['superadmin'],
  },
  {
    id: 'bonuses',
    title: 'Bonus Settings',
    description: 'Configure various types of bonuses across the platform',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    href: '/dashboard/settings/bonuses',
    permissions: ['company', 'superadmin'],
  },
  {
    id: 'affiliate',
    title: 'Affiliate Settings',
    description: 'Configure default affiliate commission settings',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    href: '/dashboard/settings/affiliate',
    permissions: ['company', 'superadmin'],
  },
  {
    id: 'games',
    title: 'Game Settings',
    description: 'Configure game status and dashboard URLs',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-7a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    href: '/dashboard/settings/games',
    permissions: ['company', 'superadmin'],
  },
];

export default function SettingsPage() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure and manage various platform settings and configurations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCategories.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className={`group block p-6 rounded-xl border transition-all duration-200 ${
              pathname === category.href
                ? 'border-[#6366f1] bg-[#6366f1]/5 dark:bg-[#6366f1]/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#6366f1]/50 hover:shadow-lg'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 p-3 rounded-lg ${
                pathname === category.href
                  ? 'bg-[#6366f1] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-[#6366f1] group-hover:text-white transition-colors'
              }`}>
                {category.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-semibold ${
                  pathname === category.href
                    ? 'text-[#6366f1] dark:text-[#6366f1]'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {category.description}
                </p>
                <div className="mt-3 flex items-center space-x-2">
                  {category.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      {permission === 'superadmin' ? 'Superadmin' : 
                       permission === 'company' ? 'Company Admin' : permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-[#6366f1] dark:text-[#6366f1] group-hover:text-[#5558e3] dark:group-hover:text-[#5558e3]">
              <span>Manage Settings</span>
              <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Settings Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Settings Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Company Settings
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Project/Platform configuration</li>
              <li>• Domain management</li>
              <li>• Admin account creation</li>
              <li>• Logo upload</li>
              <li>• Service configuration</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Bonus Settings
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Purchase bonuses (user-specific)</li>
              <li>• Recharge bonuses (game-specific)</li>
              <li>• Transfer bonuses (balance transfers)</li>
              <li>• Signup bonuses (new users)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Affiliate Settings
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Default commission percentages</li>
              <li>• Fee configurations</li>
              <li>• Payment method fees</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Game Settings
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Game status management</li>
              <li>• Dashboard URL configuration</li>
              <li>• Game enable/disable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
