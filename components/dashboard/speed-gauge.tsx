'use client';

interface SpeedGaugeProps {
  speed: number;
  maxSpeed?: number;
}

export function SpeedGauge({ speed = 81, maxSpeed = 140 }: SpeedGaugeProps) {
  const percentage = (speed / maxSpeed) * 100;
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Speed</h3>
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
            className="text-muted"
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
            className="text-primary"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg sm:text-2xl font-bold text-foreground">{speed}</span>
          <span className="text-xs text-muted-foreground">km/hr</span>
        </div>
      </div>
    </div>
  );
}
