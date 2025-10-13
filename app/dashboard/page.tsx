'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import {
  ControlGrid,
  BonusWidget,
  ServerUptimeGauge,
  TransactionStatusWidget,
  RevenueWidget,
  FeaturedGameWidget,
  GameActivityChart,
  JackpotPoolGauge,
  TopSlotsWidget,
} from '@/components/dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === USER_ROLES.SUPERADMIN;
  const isCompanyAdmin = user?.role === USER_ROLES.COMPANY;

  return (
    <div className="min-h-screen">
      {/* 🎨 CREATIVE RESPONSIVE LAYOUT:
          Mobile (< 640px): Single column, stacked with native app feel
          Tablet (640px-1024px): 2 columns, key metrics prioritized
          Laptop (1024px-1280px): 12-col grid, sidebar + main
          Desktop (1280px+): Full 3-column layout
      */}

      {/* Mobile: Native App Layout */}
      <div className="lg:hidden pb-24">
        {/* Quick Controls - First Priority */}
        <div className="sm:hidden mb-6">
          <ControlGrid />
        </div>

        {/* Bonus Programs - Second Priority */}
        <div className="sm:hidden mb-6">
          <BonusWidget />
        </div>

        {/* Key Metrics - Compact Row */}
        <div className="sm:hidden mb-6">
          <div className="grid grid-cols-2 gap-4">
            {/* System Status */}
            <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-4 border border-border/30 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">System Status</h3>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Uptime</span>
                  <span className="text-lg font-bold text-green-500">99.8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Players</span>
                  <span className="text-lg font-bold text-foreground">1,247</span>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-4 border border-border/30 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Today</span>
                  <span className="text-lg font-bold text-blue-500">$45K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Peak</span>
                  <span className="text-lg font-bold text-foreground">$125K</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Content */}
        <div className="sm:hidden mb-6">
          <FeaturedGameWidget />
        </div>

        {/* Top Slots & Transaction Status */}
        <div className="sm:hidden mb-6">
          <div className="space-y-4">
            <TopSlotsWidget />
            <div className="grid grid-cols-2 gap-4">
              <TransactionStatusWidget />
              <GameActivityChart />
            </div>
          </div>
        </div>

        {/* Revenue & Jackpot */}
        <div className="sm:hidden">
          <div className="grid grid-cols-2 gap-4">
            <RevenueWidget />
            <JackpotPoolGauge current={45000} max={100000} lastWin={12500} />
          </div>
        </div>

        {/* Tablet Layout - Keep existing for tablets */}
        <div className="hidden sm:block space-y-4">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <ServerUptimeGauge speed={99.8} />
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Live</h3>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-green-500">1,247</div>
                <div className="text-xs text-muted-foreground">Active Players</div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <div>
                    <div className="text-sm font-semibold">892</div>
                    <div className="text-[10px] text-muted-foreground">Playing</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">1,589</div>
                    <div className="text-[10px] text-muted-foreground">Peak</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Controls */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
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
                placeholder="Search..."
                className="w-full pl-6 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm font-medium"
              />
            </div>
          </div>

          <ControlGrid />
          <div className="grid grid-cols-2 gap-4">
            <JackpotPoolGauge current={45000} max={100000} lastWin={12500} />
            <RevenueWidget />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TransactionStatusWidget />
            <GameActivityChart />
          </div>
          <TopSlotsWidget />
          <FeaturedGameWidget />
          <BonusWidget />
        </div>
      </div>

      {/* Desktop: Advanced 3-Column Grid Layout */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 xl:gap-6">
        {/* Left Sidebar - Quick Access & Controls */}
        <div className="lg:col-span-3 space-y-4 xl:space-y-5">
          {/* Global Search - Enhanced */}
          <div className="bg-card rounded-xl p-3 xl:p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
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
                placeholder="Search anything..."
                className="w-full pl-6 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm font-medium"
              />
            </div>
          </div>

          <ControlGrid />
          <BonusWidget />
        </div>

        {/* Main Content Area - Optimized for Laptop+ */}
        <div className="lg:col-span-6 space-y-4 xl:space-y-5">
          {/* System Health & Live Players - Desktop Version */}
          <div className="grid grid-cols-2 gap-4 xl:gap-5">
            <ServerUptimeGauge speed={99.8} />
            
            {/* Live Players - Full Desktop Version */}
            <div className="bg-card rounded-xl p-4 xl:p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm xl:text-base font-semibold text-muted-foreground">Live Players</h3>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
              </div>
              <div className="text-center">
                <div className="w-16 h-16 xl:w-20 xl:h-20 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 xl:w-10 xl:h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="space-y-2 xl:space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Active Players</span>
                    <span className="text-lg xl:text-xl font-bold text-green-500">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Playing Now</span>
                    <span className="text-foreground font-semibold">892</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Peak Today</span>
                    <span className="text-foreground font-semibold">1,589</span>
                  </div>
                  <div className="text-xs text-muted-foreground/80 mt-3 pt-3 border-t border-border flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse"></div>
                    Updated 2 min ago
                  </div>
                </div>
              </div>
            </div>
          </div>

          <TopSlotsWidget />
          <FeaturedGameWidget />
        </div>

        {/* Right Sidebar - Financial Overview */}
        <div className="lg:col-span-3 space-y-4 xl:space-y-5">
          <JackpotPoolGauge current={45000} max={100000} lastWin={12500} />
          <TransactionStatusWidget />
          <RevenueWidget />
          <GameActivityChart />
        </div>
      </div>
    </div>
  );
}

