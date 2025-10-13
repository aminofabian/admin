'use client';

import { useEffect, useState } from 'react';
import { dashboardStatsApi } from '@/lib/api/dashboard-stats';

interface AffiliatePerformanceProps {
  totalAffiliates?: number;
  activeAffiliates?: number;
}

export function ServerUptimeGauge({ totalAffiliates: initialTotal, activeAffiliates: initialActive }: AffiliatePerformanceProps) {
  const [totalAffiliates, setTotalAffiliates] = useState(initialTotal || 0);
  const [activeAffiliates, setActiveAffiliates] = useState(initialActive || 0);
  const [loading, setLoading] = useState(!initialTotal);

  useEffect(() => {
    const fetchAffiliateStats = async () => {
      try {
        const stats = await dashboardStatsApi.getStats();
        setTotalAffiliates(stats.totalAffiliates);
        // Active affiliates are those with players
        const active = stats.topAffiliates.filter(a => a.total_players > 0).length;
        setActiveAffiliates(active);
      } catch (error) {
        console.error('Error fetching affiliate stats:', error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    if (!initialTotal) {
      fetchAffiliateStats();
      
      // Refresh every 5 minutes
      const interval = setInterval(fetchAffiliateStats, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [initialTotal]);

  const percentage = totalAffiliates > 0 ? (activeAffiliates / totalAffiliates) * 100 : 0;
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  const getPerformanceColor = () => {
    if (percentage >= 75) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-orange-500';
  };

  return (
    <div className="bg-card dark:bg-gray-800 rounded-xl p-4 border border-border dark:border-gray-700">
      <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-4">Affiliate Network</h3>
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            className={loading ? 'text-gray-400' : getPerformanceColor()}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg sm:text-2xl font-bold text-foreground dark:text-gray-100">
            {loading ? '...' : activeAffiliates}
          </span>
          <span className="text-xs text-muted-foreground dark:text-gray-400">
            of {totalAffiliates}
          </span>
          <span className="text-[10px] text-muted-foreground dark:text-gray-500 mt-1">
            active agents
          </span>
        </div>
      </div>
    </div>
  );
}
