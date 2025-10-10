'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import {
  ControlGrid,
  AirConditionerWidget,
  SpeedGauge,
  WeatherWidget,
  BatteryWidget,
  MusicPlayer,
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
      {/* Left Sidebar - Admin Controls */}
      <div className="lg:col-span-3 space-y-4 lg:space-y-6">
        {/* Search Bar */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <input
            type="text"
            placeholder="Search users, games, transactions..."
            className="w-full bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
          />
        </div>

        {/* Admin Control Grid */}
        <ControlGrid />

        {/* Active Bonus Programs */}
        <AirConditionerWidget />
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-6 space-y-4 lg:space-y-6">
        {/* Top Row - Game Uptime and Active Players */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <SpeedGauge speed={99.8} />
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Live Players</h3>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl sm:text-2xl">👥</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Players</span>
                  <span className="text-foreground font-semibold text-green-500">1,247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Playing Now</span>
                  <span className="text-foreground">892</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peak Today</span>
                  <span className="text-foreground">1,589</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">Last updated 2 min ago</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Slots */}
        <MapWidget />

        {/* Slot Game Management */}
        <MusicPlayer />
      </div>

      {/* Right Sidebar - Game Financial Panels */}
      <div className="lg:col-span-3 space-y-4 lg:space-y-6">
        {/* Jackpot Pool Gauge */}
        <LoadGauge current={45000} max={100000} lastWin={12500} />

        {/* Transaction Health Widget */}
        <WeatherWidget />

        {/* Revenue Performance Widget */}
        <BatteryWidget />

        {/* Slot Game Activity Chart */}
        <UsageChart />
      </div>
    </div>
  );
}

