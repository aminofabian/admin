'use client';

interface BatteryData {
  range: number;
  percentage: number;
  distanceTraveled: number;
  isCharging: boolean;
}

export function BatteryWidget() {
  const battery: BatteryData = {
    range: 450,
    percentage: 85,
    distanceTraveled: 1909,
    isCharging: true,
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Battery</h3>
      
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-foreground mb-1">
          {battery.range} km Left
        </div>
        
        {/* Battery Icon */}
        <div className="relative w-16 h-8 mx-auto mb-2">
          <div className="w-full h-full border-2 border-primary rounded-sm">
            <div 
              className="h-full bg-primary rounded-sm transition-all duration-300"
              style={{ width: `${battery.percentage}%` }}
            />
          </div>
          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-3 bg-primary rounded-r-sm" />
          {battery.isCharging && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-primary-foreground text-xs">⚡</span>
            </div>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {battery.percentage}% {battery.isCharging ? 'Charging' : 'Charged'}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Distance Travel</span>
          <span className="text-foreground">{battery.distanceTraveled} km</span>
        </div>
      </div>
    </div>
  );
}
