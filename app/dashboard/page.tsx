'use client';

import { useAuth } from '@/providers/auth-provider';
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-full">
      {/* Left Sidebar - Controls */}
      <div className="lg:col-span-3 space-y-4 lg:space-y-6">
        {/* Search Bar */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
          />
        </div>

        {/* Control Grid */}
        <ControlGrid />

        {/* Air Conditioner */}
        <AirConditionerWidget />
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-6 space-y-4 lg:space-y-6">
        {/* Top Row - Speed Gauge and Car Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <SpeedGauge speed={81} />
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Car Status</h3>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/20 rounded-lg flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🚗</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">72 Km</span>
                  <span className="text-foreground">28 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">56 min</span>
                  <span className="text-foreground">10:37 pm</span>
                </div>
                <div className="text-xs text-muted-foreground">41 arrival mi</div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Widget */}
        <MapWidget />

        {/* Music Player */}
        <MusicPlayer />
      </div>

      {/* Right Sidebar - Data Panels */}
      <div className="lg:col-span-3 space-y-4 lg:space-y-6">
        {/* Load Gauge */}
        <LoadGauge current={400} max={600} lastLoad={50} />

        {/* Weather Widget */}
        <WeatherWidget />

        {/* Battery Widget */}
        <BatteryWidget />

        {/* Usage Chart */}
        <UsageChart />
      </div>
    </div>
  );
}

