'use client';

interface LoadData {
  current: number;
  max: number;
  lastLoad: number;
}

export function LoadGauge({ current = 400, max = 600, lastLoad = 50 }: LoadData) {
  const percentage = (current / max) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Load</h3>
      
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            className="text-purple-500"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground">{current}</span>
          <span className="text-xs text-muted-foreground">kg</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Max Load</span>
          <span className="text-foreground">{max} kg</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Last Load</span>
          <span className="text-foreground">{lastLoad} kg</span>
        </div>
      </div>
    </div>
  );
}
