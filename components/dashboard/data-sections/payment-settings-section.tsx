'use client';

export function PaymentSettingsSection() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Payment Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure payment methods and processing settings
        </p>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-card">
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Payment settings will be available here shortly
          </p>
        </div>
      </div>
    </div>
  );
}
