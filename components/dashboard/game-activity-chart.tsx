'use client';

interface GameActivityData {
  activeGames: number;
  pendingTransactions: number;
  maintenance: number;
}

export function GameActivityChart() {
  const gameActivity: GameActivityData = {
    activeGames: 65,
    pendingTransactions: 25,
    maintenance: 10,
  };

  const total = gameActivity.activeGames + gameActivity.pendingTransactions + gameActivity.maintenance;
  const activeAngle = (gameActivity.activeGames / total) * 360;
  const pendingAngle = (gameActivity.pendingTransactions / total) * 360;
  const maintenanceAngle = (gameActivity.maintenance / total) * 360;

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Slot Game Activity</h3>
      
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Active Games */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgb(99 102 241)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(activeAngle / 360) * 251.2} 251.2`}
              strokeDashoffset="0"
            />
            {/* Pending Transactions */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgb(99 102 241 / 0.5)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(pendingAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={`-${(activeAngle / 360) * 251.2}`}
            />
            {/* Maintenance */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgb(71 85 105)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(maintenanceAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={`-${((activeAngle + pendingAngle) / 360) * 251.2}`}
            />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-muted-foreground">Active Games</span>
          </div>
          <span className="text-foreground font-medium">{gameActivity.activeGames}%</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary/50 rounded-full" />
            <span className="text-muted-foreground">Pending TX</span>
          </div>
          <span className="text-foreground font-medium">{gameActivity.pendingTransactions}%</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted-foreground rounded-full" />
            <span className="text-muted-foreground">Maintenance</span>
          </div>
          <span className="text-foreground font-medium">{gameActivity.maintenance}%</span>
        </div>
      </div>
    </div>
  );
}
