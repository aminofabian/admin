'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Trophy, Flame, Sparkles, Users, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAffiliatesStore } from '@/stores';
import type { Affiliate } from '@/types';

interface TopAffiliate extends Affiliate {
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  status: 'hot' | 'active' | 'normal';
}

export function TopAffiliatesWidget() {
  const { affiliates, isLoading, error, fetchAffiliates } = useAffiliatesStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch affiliates on mount if not already loaded
  useEffect(() => {
    if (!affiliates && !isLoading) {
      fetchAffiliates();
    }
  }, [affiliates, isLoading, fetchAffiliates]);

  // Sort affiliates by total_earnings and add trend/status indicators
  const topAffiliates: TopAffiliate[] = affiliates?.results
    ? [...affiliates.results]
        .sort((a, b) => b.total_earnings - a.total_earnings)
        .slice(0, 4) // Top 4 affiliates
        .map((affiliate, index) => {
          // Calculate trend based on earnings vs topup ratio
          const earningsRatio = affiliate.total_topup > 0 
            ? (affiliate.total_earnings / affiliate.total_topup) * 100 
            : 0;
          
          return {
            ...affiliate,
            trend: earningsRatio > 15 ? 'up' : earningsRatio < 10 ? 'down' : 'stable',
            trendPercentage: Number(earningsRatio.toFixed(1)),
            status: index === 0 ? 'hot' : index < 3 ? 'active' : 'normal',
          };
        })
    : [];

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

  // Auto-play functionality with smooth transitions
  useEffect(() => {
    if (!isAutoPlaying || topAffiliates.length === 0) return;
    
    const interval = setInterval(() => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedIndex((prev) => (prev + 1) % topAffiliates.length);
        setTimeout(() => setIsTransitioning(false), 150);
      }, 150);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, topAffiliates.length, isTransitioning]);

  // Navigation functions with smooth transitions
  const goToNext = () => {
    if (isTransitioning || topAffiliates.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex((prev) => (prev + 1) % topAffiliates.length);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    if (isTransitioning || topAffiliates.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex((prev) => (prev - 1 + topAffiliates.length) % topAffiliates.length);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === selectedIndex || topAffiliates.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex(index);
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
    setIsAutoPlaying(false);
  };

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="relative bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-5 border border-border/50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-5 border border-border/50">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Failed to load affiliates: {error}</p>
        </div>
      </div>
    );
  }

  if (topAffiliates.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-card via-card to-primary/5 rounded-xl p-5 border border-border/50">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No affiliate data available</p>
        </div>
      </div>
    );
  }

  const selectedAffiliate = topAffiliates[selectedIndex];

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
                Top Performing Affiliates
              </h3>
              <p className="text-xs text-muted-foreground">By total earnings</p>
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
              
              {/* Affiliate info */}
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
                    {selectedAffiliate.name}
                  </h4>
                  {selectedAffiliate.status === 'hot' && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg shadow-primary/20 animate-pulse">
                      <Flame className="w-3.5 h-3.5" />
                      TOP
                    </span>
                  )}
                </div>
                
                {/* Commission rate progress bar */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-primary rounded-full transition-all duration-1000 ease-out ${
                        isTransitioning ? 'w-0' : ''
                      }`}
                      style={{ 
                        width: isTransitioning ? '0%' : `${Math.min(Number(selectedAffiliate.affiliate_percentage), 100)}%`,
                        transitionDelay: isTransitioning ? '0ms' : '400ms'
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-primary min-w-[3rem] text-right">
                    {selectedAffiliate.affiliate_percentage}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Commission Rate</p>
              </div>
              
              {/* Trend indicator */}
              <div 
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-600 ease-out ${
                  selectedAffiliate.trend === 'up' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                } ${
                  isTransitioning 
                    ? 'scale-75 opacity-0 -translate-x-4' 
                    : 'scale-100 opacity-100 translate-x-0'
                }`}
                style={{ transitionDelay: isTransitioning ? '0ms' : '300ms' }}
              >
                {selectedAffiliate.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {selectedAffiliate.trendPercentage}%
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
                  <p className="text-lg font-bold text-foreground">{selectedAffiliate.total_players.toLocaleString()}</p>
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
                  <p className="text-xs text-muted-foreground mb-0.5">Earnings</p>
                  <p className="text-lg font-bold text-foreground">
                    ${selectedAffiliate.total_earnings >= 1000 
                      ? `${(selectedAffiliate.total_earnings / 1000).toFixed(1)}k` 
                      : selectedAffiliate.total_earnings.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {topAffiliates.map((_, index) => (
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
            {selectedIndex + 1} of {topAffiliates.length}
          </span>
        </div>
      </div>
    </div>
  );
}
