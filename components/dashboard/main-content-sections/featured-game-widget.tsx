'use client';

interface TopGameData {
  id: number;
  name: string;
  image_url: string;
  playerCount: number;
  status: string;
}

export function FeaturedGameWidget() {
  // Mock data for top performing game
  const topGame: TopGameData = {
    id: 1,
    name: 'Fire Kirin',
    image_url: '',
    playerCount: 1247,
    status: 'hot',
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="bg-card dark:bg-gray-800 rounded-xl p-4 border border-border dark:border-gray-700">
      <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-4">
        🏆 Top Performing Game
      </h3>
      
      <div className="flex items-center space-x-3 mb-4">
        {/* Game Image or Icon */}
        {topGame.image_url ? (
          <img 
            src={topGame.image_url} 
            alt={topGame.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-yellow-500 dark:to-orange-600 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-foreground dark:text-gray-100 truncate">
            {topGame.name}
          </div>
          <div className="text-sm text-muted-foreground dark:text-gray-400">
            Most popular game right now
          </div>
        </div>
      </div>

      {/* Player Stats */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground dark:text-gray-400 mb-1">Active Players</div>
            <div className="text-3xl font-bold text-primary dark:text-blue-400">
              {formatCount(topGame.playerCount)}
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-muted dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Status</div>
          <div className={`text-sm font-semibold ${topGame.status === 'hot' ? 'text-orange-500' : 'text-green-500'}`}>
            {topGame.status === 'hot' ? '🔥 Hot' : '✅ Active'}
          </div>
        </div>
        <div className="text-center p-3 bg-muted dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Rank</div>
          <div className="text-sm font-semibold text-yellow-500">#1 Top</div>
        </div>
      </div>
    </div>
  );
}

