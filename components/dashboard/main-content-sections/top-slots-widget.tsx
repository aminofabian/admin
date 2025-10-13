'use client';

interface TopGame {
  id: number;
  name: string;
  image?: string;
  players: number;
  status: 'hot' | 'active' | 'normal';
}

export function TopSlotsWidget() {
  const topGames: TopGame[] = [
    { id: 1, name: 'Fire Kirin', players: 1247, status: 'hot' },
    { id: 2, name: 'Panda Master', players: 892, status: 'active' },
    { id: 3, name: 'Juwa', players: 654, status: 'active' },
    { id: 4, name: 'Game Vault', players: 423, status: 'normal' },
  ];

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Top Performing Slots
      </h3>
      
      <div className="relative h-32 sm:h-48 bg-primary/5 rounded-lg overflow-hidden p-3 sm:p-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute top-1/4 left-1/4 w-4 h-4 sm:w-6 sm:h-6 bg-primary/60 rounded-full animate-pulse">
            <div className="absolute -top-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 bg-primary/20 rounded-full" />
          </div>
          <div className="absolute top-1/3 right-1/4 w-3 h-3 sm:w-5 sm:h-5 bg-primary/40 rounded-full animate-pulse">
            <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-7 sm:h-7 bg-primary/15 rounded-full" />
          </div>
          <div className="absolute bottom-1/3 left-1/3 w-3 h-3 sm:w-4 sm:h-4 bg-primary/30 rounded-full animate-pulse">
            <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 bg-primary/10 rounded-full" />
          </div>
          
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-card/80 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1 border border-border/50">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            <span className="text-xs font-medium text-foreground">Top</span>
          </div>
        </div>
        
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 bg-card/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 max-h-24 overflow-y-auto border border-border/50">
          <div className="space-y-1">
            {topGames.slice(0, 2).map((game, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <span className="text-foreground font-medium truncate flex-1">{game.name}</span>
                <span className="text-muted-foreground ml-2">{game.players} players</span>
                {game.status === 'hot' && (
                  <div className="w-1 h-1 ml-2 bg-primary rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
