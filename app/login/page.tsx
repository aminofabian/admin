'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Button, Input, Card, CardContent } from '@/components/ui';
import type { LoginRequest } from '@/types';

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
    whitelabel_admin_uuid: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8 bg-gray-50 dark:bg-transparent">
      {/* Animated gradient background - Only visible in dark mode */}
      <div className="absolute inset-0 bg-white dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950" />
      
      {/* Decorative blobs - Lighter in light mode */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-100 dark:bg-purple-900/30 rounded-full mix-blend-normal dark:mix-blend-soft-light filter blur-3xl opacity-40 dark:opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-100 dark:bg-indigo-900/30 rounded-full mix-blend-normal dark:mix-blend-soft-light filter blur-3xl opacity-40 dark:opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-100 dark:bg-pink-900/30 rounded-full mix-blend-normal dark:mix-blend-soft-light filter blur-3xl opacity-40 dark:opacity-70 animate-blob animation-delay-4000" />

      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <div className="flex items-center bg-white dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-full p-1 shadow-md">
          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded-full text-xs lg:text-sm font-medium transition-all duration-200 ${
              theme === 'light'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
            }`}
          >
            Light
          </button>
          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded-full text-xs lg:text-sm font-medium transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Login card */}
      <Card className="w-full max-w-md relative z-10 shadow-xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:bg-gradient-to-r dark:from-indigo-400 dark:to-purple-400 dark:bg-clip-text dark:text-transparent">
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-muted-foreground mt-2 text-sm">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <Input
                label="Username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter your username"
                required
                className="transition-all duration-200 focus:scale-[1.01]"
              />

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                required
                className="transition-all duration-200 focus:scale-[1.01]"
              />

              <div className="pt-1">
                <Input
                  label="Project UUID (Optional)"
                  type="text"
                  value={formData.whitelabel_admin_uuid || ''}
                  onChange={(e) => setFormData({ ...formData, whitelabel_admin_uuid: e.target.value })}
                  placeholder="Leave empty for superadmin"
                  className="transition-all duration-200 focus:scale-[1.01]"
                />
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1.5 ml-0.5">
                  Only required for project-specific access
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-shake">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 py-6 text-base font-semibold"
              isLoading={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-muted-foreground">
              Secure authentication powered by your admin system
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

