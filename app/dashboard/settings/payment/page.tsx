'use client';

export default function PaymentSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure payment methods and processing settings
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="border border-border rounded-lg bg-card">
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Payment Settings</h2>
          <p className="text-muted-foreground">
            Configure payment methods and processing settings
          </p>
        </div>
      </div>
    </div>
  );
}
