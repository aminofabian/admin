'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Trophy, Flame, Sparkles, Users, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

interface TopGame {
  id: number;
  name: string;
  image?: string;
  players: number;
  revenue: number;
  winRate: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  status: 'hot' | 'active' | 'normal';
}

export function TopSlotsWidget() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const topGames: TopGame[] = [
    { 
      id: 1, 
      name: 'Fire Kirin', 
      players: 1247, 
      revenue: 45230,
      winRate: 94.5,
      trend: 'up',
      trendPercentage: 12.3,
      status: 'hot' 
    },
    { 
      id: 2, 
      name: 'Panda Master', 
      players: 892, 
      revenue: 32150,
      winRate: 92.8,
      trend: 'up',
      trendPercentage: 8.7,
      status: 'active' 
    },
    { 
      id: 3, 
      name: 'Juwa', 
      players: 654, 
      revenue: 28940,
      winRate: 91.2,
      trend: 'down',
      trendPercentage: 3.2,
      status: 'active' 
    },
    { 
      id: 4, 
      name: 'Game Vault', 
      players: 423, 
      revenue: 18650,
      winRate: 89.7,
      trend: 'up',
      trendPercentage: 5.1,
      status: 'normal' 
    },
  ];

  const getRankOpacity = (index: number) => {
    switch (index) {
      case 0: return 'from-primary/15 via-primary/8 to-transparent';
      case 1: return 'from-primary/10 via-primary/5 to-transparent';
      case 2: return 'from-primary/8 via-primary/4 to-transparent';
      default: return 'from-primary/5 via-primary/3 to-transparent';
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-primary fill-primary/10" />;
      case 1: return <Trophy className="w-5 h-5 text-primary/70 fill-primary/5" />;
      case 2: return <Trophy className="w-5 h-5 text-primary/50 fill-primary/5" />;
      default: return null;
    }
  };

  const selectedGame = topGames[selectedIndex];

  // Auto-play functionality with smooth transitions
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedIndex((prev) => (prev + 1) % topGames.length);
        setTimeout(() => setIsTransitioning(false), 150);
      }, 150);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, topGames.length, isTransitioning]);

  // Navigation functions with smooth transitions
  const goToNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex((prev) => (prev + 1) % topGames.length);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex((prev) => (prev - 1 + topGames.length) % topGames.length);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === selectedIndex) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex(index);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
    setIsAutoPlaying(false);
  };

  return (
    <div className="relative bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-5 border border-border/50 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/3 rounded-full blur-2xl" />
      
      <div className="relative">
        {/* Header with dropdown */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Top Performing Slots
              </h3>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </div>
          </div>

          {/* Slide navigation controls */}
          <div className="flex items-center gap-2">
            {/* Auto-play toggle */}
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              disabled={isTransitioning}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                isAutoPlaying 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
              } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
              title={isAutoPlaying ? 'Pause auto-play' : 'Start auto-play'}
            >
              {isAutoPlaying ? '⏸' : '▶'}
            </button>

            {/* Previous button */}
            <button
              onClick={goToPrevious}
              disabled={isTransitioning}
              className={`w-8 h-8 rounded-lg bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center justify-center transition-all ${
                isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
              }`}
              title="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next button */}
            <button
              onClick={goToNext}
              disabled={isTransitioning}
              className={`w-8 h-8 rounded-lg bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-primary flex items-center justify-center transition-all ${
                isTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
              }`}
              title="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Slide container with smooth transitions */}
        <div className="group relative overflow-hidden">
          {/* Animated background gradient */}
          <div 
            className={`absolute inset-0 bg-gradient-to-r ${getRankOpacity(selectedIndex)} rounded-xl opacity-50 group-hover:opacity-100 transition-all duration-700 ease-in-out`} 
          />
          
          {/* Card content with smooth slide animation */}
          <div 
            className={`relative bg-card/50 backdrop-blur-sm rounded-xl p-5 border border-border/50 hover:border-primary/50 transition-all duration-700 ease-in-out hover:shadow-lg hover:shadow-primary/10 transform ${
              isTransitioning 
                ? 'scale-95 opacity-0 translate-y-2' 
                : 'scale-100 opacity-100 translate-y-0'
            }`}
            style={{
              transitionDelay: isTransitioning ? '0ms' : '150ms',
            }}
          >
            <div className="flex items-start gap-4 mb-4">
              {/* Rank with icon/number */}
              <div 
                className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 transition-all duration-600 ease-out ${
                  isTransitioning 
                    ? 'scale-75 opacity-0 rotate-12' 
                    : 'scale-100 opacity-100 rotate-0'
                }`}
                style={{ transitionDelay: isTransitioning ? '0ms' : '200ms' }}
              >
                {getRankIcon(selectedIndex) || (
                  <span className="text-lg font-bold text-muted-foreground">
                    #{selectedIndex + 1}
                  </span>
                )}
              </div>
              
              {/* Game info */}
              <div 
                className={`flex-1 min-w-0 transition-all duration-600 ease-out ${
                  isTransitioning 
                    ? 'opacity-0 translate-x-4' 
                    : 'opacity-100 translate-x-0'
                }`}
                style={{ transitionDelay: isTransitioning ? '0ms' : '250ms' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-xl text-foreground truncate">
                    {selectedGame.name}
                  </h4>
                  {selectedGame.status === 'hot' && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg shadow-primary/20 animate-pulse">
                      <Flame className="w-3.5 h-3.5" />
                      HOT
                    </span>
                  )}
                </div>
                
                {/* Win rate progress bar */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-primary rounded-full transition-all duration-1000 ease-out ${
                        isTransitioning ? 'w-0' : ''
                      }`}
                      style={{ 
                        width: isTransitioning ? '0%' : `${selectedGame.winRate}%`,
                        transitionDelay: isTransitioning ? '0ms' : '400ms'
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-primary min-w-[3rem] text-right">
                    {selectedGame.winRate}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              
              {/* Trend indicator */}
              <div 
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-600 ease-out ${
                  selectedGame.trend === 'up' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                } ${
                  isTransitioning 
                    ? 'scale-75 opacity-0 -translate-x-4' 
                    : 'scale-100 opacity-100 translate-x-0'
                }`}
                style={{ transitionDelay: isTransitioning ? '0ms' : '300ms' }}
              >
                {selectedGame.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {selectedGame.trendPercentage}%
              </div>
            </div>
            
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all duration-600 ease-out ${
                  isTransitioning 
                    ? 'opacity-0 translate-y-4 scale-95' 
                    : 'opacity-100 translate-y-0 scale-100'
                }`}
                style={{ transitionDelay: isTransitioning ? '0ms' : '500ms' }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Players</p>
                  <p className="text-lg font-bold text-foreground">{selectedGame.players.toLocaleString()}</p>
                </div>
              </div>
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all duration-600 ease-out ${
                  isTransitioning 
                    ? 'opacity-0 translate-y-4 scale-95' 
                    : 'opacity-100 translate-y-0 scale-100'
                }`}
                style={{ transitionDelay: isTransitioning ? '0ms' : '600ms' }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Revenue</p>
                  <p className="text-lg font-bold text-foreground">${(selectedGame.revenue / 1000).toFixed(1)}k</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {topGames.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={`w-2 h-2 rounded-full transition-all duration-500 ease-out ${
                index === selectedIndex
                  ? 'bg-primary w-6 shadow-lg shadow-primary/20 scale-110'
                  : 'bg-muted hover:bg-primary/50 hover:scale-110'
              } ${isTransitioning ? 'pointer-events-none opacity-50' : 'pointer-events-auto opacity-100'}`}
              title={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slide counter */}
        <div className="flex items-center justify-center mt-2">
          <span className="text-xs text-muted-foreground">
            {selectedIndex + 1} of {topGames.length}
          </span>
        </div>
      </div>
    </div>
  );
}
