'use client';

import { useState } from 'react';

interface SlotGameData {
  title: string;
  description: string;
  currentBalance: number;
  maxBalance: number;
  isActive: boolean;
}

export function FeaturedGameWidget() {
  const [slotGame, setSlotGame] = useState<SlotGameData>({
    title: 'Mega Fortune Slots',
    description: 'Progressive jackpot slot game',
    currentBalance: 1250000,
    maxBalance: 5000000,
    isActive: false,
  });

  const formatBalance = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const progressPercentage = (slotGame.currentBalance / slotGame.maxBalance) * 100;

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Featured Slot Game</h3>
      
      <div className="flex items-center space-x-3 mb-4">
        {/* Slot Game Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {slotGame.title}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {slotGame.description}
          </div>
        </div>
        
        {/* Game Status Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          slotGame.isActive 
            ? 'bg-green-500/20 text-green-500' 
            : 'bg-gray-500/20 text-gray-500'
        }`}>
          {slotGame.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Jackpot Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Current Pool: {formatBalance(slotGame.currentBalance)}</span>
          <span>Target: {formatBalance(slotGame.maxBalance)}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-right text-muted-foreground">
          {progressPercentage.toFixed(1)}% of target
        </div>
      </div>

      {/* Game Management Controls */}
      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => setSlotGame(prev => ({ ...prev, isActive: !prev.isActive }))}
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
          title={slotGame.isActive ? "Disable Game" : "Enable Game"}
        >
          <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span className="text-xs">{slotGame.isActive ? 'Disable' : 'Enable'}</span>
        </button>
        
        <button 
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
          title="Adjust Jackpot"
        >
          <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs">Jackpot</span>
        </button>
        
        <button 
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
          title="Game Settings"
        >
          <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">Settings</span>
        </button>
        
        <button 
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
          title="View Analytics"
        >
          <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs">Stats</span>
        </button>
      </div>
    </div>
  );
}

