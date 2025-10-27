'use client';

export default function SocialLinksPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Social Links</h1>
        <p className="text-muted-foreground mt-1">
          Configure social media links and sharing settings
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="border border-border rounded-lg bg-card">
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Social Links</h2>
          <p className="text-muted-foreground">
            Configure your social media links and sharing settings
          </p>
        </div>
      </div>
    </div>
  );
}
