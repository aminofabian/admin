import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import type { AdminAnalyticsData } from '@/lib/api/analytics';

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await analyticsApi.getDashboard();

        if (response.status === 'success' && response.data) {
          setData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch analytics');
        }
      } catch (err: unknown) {
        let errorMessage = 'Failed to load analytics data';

        if (err && typeof err === 'object' && 'message' in err) {
          errorMessage = String(err.message);
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        console.warn('⚠️ Admin analytics failed:', errorMessage);
        setError(errorMessage);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, []);

  return { data, loading, error };
}

