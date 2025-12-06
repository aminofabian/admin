'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsCategories = [
  {
    id: 'banners',
    title: 'Banners',
    description: 'View banner configurations (read-only)',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    href: '/dashboard/settings/banners',
  },
  {
    id: 'payment',
    title: 'Payment Settings',
    description: 'View payment method configurations (read-only)',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    href: '/dashboard/settings/payment',
  },
];

/**
 * Manager Settings Section - Read-only
 * Shows settings categories as links to sub-pages
 */
export default function ManagerSettingsSection() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View platform settings and configurations (read-only)
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
                <div className="mt-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    Read-only
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-[#6366f1] dark:text-[#6366f1] group-hover:text-[#5558e3] dark:group-hover:text-[#5558e3]">
              <span>View Settings</span>
              <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

