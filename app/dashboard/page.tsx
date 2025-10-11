'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import {
  ControlGrid,
  BonusWidget,
  SpeedGauge,
  WeatherWidget,
  BatteryWidget,
  FeaturedGameWidget,
  UsageChart,
  LoadGauge,
  MapWidget,
} from '@/components/dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === USER_ROLES.SUPERADMIN;
  const isCompanyAdmin = user?.role === USER_ROLES.COMPANY;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-full">
      {/* Left Sidebar - Quick Access & Controls */}
      <div className="lg:col-span-3 space-y-4 lg:space-y-6">
        {/* Global Search */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="relative">
            <svg
              className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search players, games, transactions..."
              className="w-full pl-6 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Quick Access Controls */}
        <ControlGrid />

        {/* Active Bonus Programs */}
        <BonusWidget />
      </div>

      {/* Main Content Area - Game & Player Analytics */}
      <div className="lg:col-span-6 space-y-4 lg:space-y-6">
        {/* System Health & Live Players */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          {/* Game Server Uptime */}
          <SpeedGauge speed={99.8} />
          
          {/* Live Players Statistics */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Live Players</h3>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Players</span>
                  <span className="text-foreground font-semibold text-green-500">1,247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Playing Now</span>
                  <span className="text-foreground font-medium">892</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peak Today</span>
                  <span className="text-foreground font-medium">1,589</span>
                </div>
                <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
                  Last updated: 2 min ago
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Slots */}
        <MapWidget />

        {/* Featured Slot Game Management */}
        <FeaturedGameWidget />
      </div>

      {/* Right Sidebar - Financial Overview */}
      <div className="lg:col-span-3 space-y-4 lg:space-y-6">
        {/* Progressive Jackpot Pool */}
        <LoadGauge current={45000} max={100000} lastWin={12500} />

        {/* Transaction Health Monitor */}
        <WeatherWidget />

        {/* Daily Revenue Performance */}
        <BatteryWidget />

        {/* Game Activity Distribution */}
        <UsageChart />
      </div>
    </div>
  );
}

