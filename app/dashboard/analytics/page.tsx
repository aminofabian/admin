'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { Card, CardContent, CardHeader } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: analyticsData, loading, error } = useAdminAnalytics();

  // Redirect if user is not a company admin
  useEffect(() => {
    if (user && user.role !== USER_ROLES.COMPANY) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">Loading analytics data...</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">Dashboard analytics and insights</p>
          </div>
          <Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Error Loading Analytics</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!analyticsData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">Dashboard analytics and insights</p>
          </div>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">No Data Available</h3>
              <p className="text-sm text-muted-foreground mt-1">Analytics data is not available at this time.</p>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-2">Dashboard analytics and insights</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Players */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Players</h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.total_players ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active players in system
              </p>
            </CardContent>
          </Card>

          {/* Total Managers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Managers</h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.total_managers ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Managers in system
              </p>
            </CardContent>
          </Card>

          {/* Total Agents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Agents</h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.total_agents ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Agents in system
              </p>
            </CardContent>
          </Card>

          {/* Total Staff */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Staff</h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.total_staffs ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Staff members in system
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Display additional analytics data if available */}
          {Object.entries(analyticsData).map(([key, value]) => {
            // Skip already displayed fields
            if (
              ['total_players', 'total_managers', 'total_agents', 'total_staffs'].includes(key)
            ) {
              return null;
            }

            // Format key for display
            const formattedKey = key
              .split('_')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            // Check if value is a number
            const isNumeric = typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));

            return (
              <Card key={key}>
                <CardHeader>
                  <h3 className="text-sm font-medium">{formattedKey}</h3>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isNumeric && (key.includes('balance') || key.includes('amount') || key.includes('revenue') || key.includes('total'))
                      ? formatCurrency(Number(value))
                      : value ?? 'N/A'}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
