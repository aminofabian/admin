'use client';

import { useEffect, useState } from 'react';
import { dashboardStatsApi } from '@/lib/api/dashboard-stats';

interface TopGame {
  id: number;
  name: string;
  image?: string;
  players: number;
  status: 'hot' | 'active' | 'normal';
}

export function TopSlotsWidget() {
  const [topGames, setTopGames] = useState<TopGame[]>([
    { id: 1, name: 'Mega Fortune', players: 1247, status: 'hot' },
    { id: 2, name: 'Lucky Slots', players: 892, status: 'active' },
    { id: 3, name: 'Diamond King', players: 654, status: 'active' },
    { id: 4, name: 'Golden Spin', players: 423, status: 'normal' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopGames = async () => {
      try {
        const games = await dashboardStatsApi.getTopGames();
        if (games && games.length > 0) {
          setTopGames(games);
        }
      } catch (error) {
        console.error('Error fetching top games:', error);
        // Keep default data on error
      } finally {
        setLoading(false);
      }
    };

    fetchTopGames();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchTopGames, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card dark:bg-gray-800 rounded-xl p-4 border border-border dark:border-gray-700">
      <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-4">
        {loading ? 'Loading Top Slots...' : 'Top Performing Slots'}
      </h3>
      
      <div className="relative h-32 sm:h-48 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg overflow-hidden p-3 sm:p-4">
        {/* Game activity visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Animated pulse circles representing game activity */}
          <div className="absolute top-1/4 left-1/4 w-4 h-4 sm:w-6 sm:h-6 bg-primary rounded-full animate-pulse">
            <div className="absolute -top-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 bg-primary/30 rounded-full" />
          </div>
          <div className="absolute top-1/3 right-1/4 w-3 h-3 sm:w-5 sm:h-5 bg-primary/70 rounded-full animate-pulse">
            <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-7 sm:h-7 bg-primary/20 rounded-full" />
          </div>
          <div className="absolute bottom-1/3 left-1/3 w-3 h-3 sm:w-4 sm:h-4 bg-primary/50 rounded-full animate-pulse">
            <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 bg-primary/15 rounded-full" />
          </div>
          
          {/* Hot game indicator */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-card/80 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium text-foreground">Hot</span>
          </div>
        </div>
        
        {/* Top games list */}
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 bg-card/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 max-h-24 overflow-y-auto">
          <div className="space-y-1">
            {topGames.slice(0, 2).map((game, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <span className="text-foreground font-medium truncate flex-1">{game.name}</span>
                <span className="text-muted-foreground ml-2">{game.players} players</span>
                {game.status === 'hot' && (
                  <svg className="w-3 h-3 ml-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
