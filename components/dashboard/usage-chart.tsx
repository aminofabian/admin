'use client';

interface UsageData {
  moving: number;
  inStation: number;
  stopped: number;
}

export function UsageChart() {
  const usage: UsageData = {
    moving: 20,
    inStation: 40,
    stopped: 40,
  };

  const total = usage.moving + usage.inStation + usage.stopped;
  const movingAngle = (usage.moving / total) * 360;
  const inStationAngle = (usage.inStation / total) * 360;
  const stoppedAngle = (usage.stopped / total) * 360;

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Avg Usage last hour</h3>
      
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Moving */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#ef4444"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(movingAngle / 360) * 251.2} 251.2`}
              strokeDashoffset="0"
            />
            {/* In Station */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#3b82f6"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(inStationAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={`-${(movingAngle / 360) * 251.2}`}
            />
            {/* Stopped */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#8b5cf6"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(stoppedAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={`-${((movingAngle + inStationAngle) / 360) * 251.2}`}
            />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-muted-foreground">Moving</span>
          </div>
          <span className="text-foreground font-medium">{usage.moving}%</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-muted-foreground">in Station</span>
          </div>
          <span className="text-foreground font-medium">{usage.inStation}%</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-muted-foreground">Stopped</span>
          </div>
          <span className="text-foreground font-medium">{usage.stopped}%</span>
        </div>
      </div>
    </div>
  );
}
