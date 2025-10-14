'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Button, Input, Card, CardContent, Logo } from '@/components/ui';
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
    } catch (err: any) {
      console.error('Login error:', err);
      
      let errorMessage = 'Login failed';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.detail) {
        errorMessage = err.detail;
      } else if (err?.error) {
        errorMessage = err.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
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
        <div className="flex items-center bg-white dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 p-1 shadow-md">
          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 text-xs lg:text-sm font-medium transition-all duration-200 ${
              theme === 'light'
                ? 'bg-[#6366f1] text-white shadow-sm'
                : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
            }`}
          >
            Light
          </button>
          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 text-xs lg:text-sm font-medium transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-[#6366f1] text-white shadow-sm'
                : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Login card */}
      <Card className="w-full max-w-xl relative z-10 shadow-xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700">
        <CardContent className="pt-12 pb-12 px-12">
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <Logo size="lg" className="transform hover:scale-105 transition-transform duration-200" />
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">
              Slotthing Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-muted-foreground mt-3 text-base">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
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

              {/* UUID is now automatically fetched - keeping field hidden */}
              {/* Users can enable manual UUID entry if needed */}
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-shake">
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
              className="w-full shadow-lg hover:shadow-xl cursor-pointer transform hover:scale-[1.02] hover:bg-[#5558e3] transition-all duration-200 py-6 text-base font-semibold"
              isLoading={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-center text-gray-500 dark:text-muted-foreground">
              Secure authentication powered by your admin system
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

