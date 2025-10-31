'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Input, Logo } from '@/components/ui';
import type { LoginRequest } from '@/types';

export default function LoginPage() {
  const { login, isFetchingUuid, uuidFetchError, refetchUuid } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
    whitelabel_admin_uuid: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showManualUuid, setShowManualUuid] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData);
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError((err as Error)?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryUuid = async () => {
    try {
      await refetchUuid();
    } catch (err) {
      console.error('Retry UUID fetch failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Beautiful Purple Gradient Background - Both light and dark modes */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900 dark:via-indigo-950 dark:to-blue-900" />
      
      {/* Animated gradient overlay for dark mode */}
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-violet-900/50 dark:via-purple-900/30 dark:to-indigo-900/40 dark:animate-pulse" style={{animationDuration: '8s'}} />
      
      {/* Enhanced Decorative Elements */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-br from-purple-200/60 to-violet-300/40 dark:from-purple-500/20 dark:to-violet-600/10 rounded-full mix-blend-normal filter blur-3xl animate-blob" />
      <div className="absolute top-0 -right-4 w-80 h-80 bg-gradient-to-br from-indigo-200/60 to-purple-300/40 dark:from-indigo-500/20 dark:to-purple-600/10 rounded-full mix-blend-normal filter blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-88 h-88 bg-gradient-to-br from-violet-200/60 to-indigo-300/40 dark:from-violet-500/20 dark:to-indigo-600/10 rounded-full mix-blend-normal filter blur-3xl animate-blob animation-delay-4000" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-200/50 to-purple-200/40 dark:from-blue-500/15 dark:to-purple-500/10 rounded-full mix-blend-normal filter blur-3xl animate-blob animation-delay-6000" />

      {/* Theme Toggle - Enhanced with Glassmorphism */}
      <div className="fixed top-6 right-6 z-50">
        <div className="flex items-center bg-white/80 dark:bg-gray-800/60 backdrop-blur-md border border-purple-200/50 dark:border-purple-500/20 p-1 shadow-lg shadow-purple-500/10">
          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 text-xs lg:text-sm font-medium transition-all duration-200 ${
              theme === 'light'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-purple-50 dark:hover:bg-purple-900/20'
            }`}
          >
            Light
          </button>
          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 text-xs lg:text-sm font-medium transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-purple-50 dark:hover:bg-purple-900/20'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Login card - Enhanced with Glassmorphism */}
      <div className="w-full max-w-xl relative z-10 bg-white/95 dark:bg-gray-900/85 backdrop-blur-md border border-purple-200/30 dark:border-purple-500/20 shadow-2xl shadow-purple-500/10 dark:shadow-purple-900/20 overflow-hidden hover:shadow-purple-500/20 dark:hover:shadow-purple-900/30 transition-all duration-300">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_50%)]" />
        </div>
        
        <div className="relative pt-12 pb-12 px-12">
          {/* Enhanced Inner Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-indigo-500/20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.1),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(282_85%_51%/0.08),transparent_60%)]" />
          </div>
          
          {/* Logo */}
          <div className="relative flex justify-center mb-10">
            <Logo size="lg" className="transform hover:scale-105 transition-transform duration-200" />
          </div>

          {/* Header - Enhanced */}
          <div className="relative text-center mb-10">
            <div className="relative inline-block">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                Slotthing Admin Panel
              </h1>
              {/* Subtle glow effect behind title */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 blur-sm -z-10 opacity-70 dark:opacity-100" />
            </div>
            <p className="text-gray-600 dark:text-muted-foreground mt-3 text-base">
              Sign in to access your dashboard
            </p>
          </div>

          {/* UUID Loading State */}
          {isFetchingUuid && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Loading project configuration...
                </p>
              </div>
            </div>
          )}

          {/* UUID Error State */}
          {uuidFetchError && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{uuidFetchError}</p>
                  <button
                    type="button"
                    onClick={handleRetryUuid}
                    className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium transition-colors duration-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form - Enhanced Container */}
          <div className="relative">
            {/* Subtle form background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-white/20 dark:from-gray-800/30 dark:to-gray-900/20 backdrop-blur-[2px] rounded-lg border border-white/20 dark:border-gray-700/20 shadow-inner" />
            
            <form onSubmit={handleSubmit} className="relative space-y-6 p-6">
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

              {/* Manual UUID Entry - Hidden by default */}
              {!showManualUuid ? (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowManualUuid(true)}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline transition-colors duration-200"
                  >
                    Need to enter project UUID manually?
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    label="Project UUID (Optional)"
                    type="text"
                    value={formData.whitelabel_admin_uuid}
                    onChange={(e) => setFormData({ ...formData, whitelabel_admin_uuid: e.target.value })}
                    placeholder="Enter your project UUID"
                    className="transition-all duration-200 focus:scale-[1.01]"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Only required if automatic configuration fails
                  </p>
                </div>
              )}
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

            {/* Submit button - Enhanced with Purple Gradient */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-6 px-6 text-base shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 cursor-pointer transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={isLoading || isFetchingUuid}
            >
              {isLoading || isFetchingUuid ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
            </form>
          </div>

          {/* Footer note - Enhanced */}
          <div className="relative mt-8 pt-8 border-t border-purple-200/30 dark:border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent h-px top-0" />
            <p className="relative text-sm text-center text-gray-500 dark:text-muted-foreground">
              Secure authentication powered by your admin system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

