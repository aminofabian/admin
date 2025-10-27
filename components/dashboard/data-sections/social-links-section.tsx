'use client';

export function SocialLinksSection() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Social Links
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure social media links and sharing settings
        </p>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-card">
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Social links management will be available here shortly
          </p>
        </div>
      </div>
    </div>
  );
}
