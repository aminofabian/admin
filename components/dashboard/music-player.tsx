'use client';

import { useState } from 'react';

interface SlotGameData {
  title: string;
  description: string;
  currentBalance: number;
  maxBalance: number;
  isActive: boolean;
}

export function MusicPlayer() {
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
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Slot Game Status</h3>
      
      <div className="flex items-center space-x-3 mb-4">
        {/* Slot Game Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground text-lg">🎰</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {slotGame.title}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {slotGame.description}
          </div>
        </div>
      </div>

      {/* Jackpot Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Current: {formatBalance(slotGame.currentBalance)}</span>
          <span>Target: {formatBalance(slotGame.maxBalance)}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Game Controls */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-4">
        <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Check Balance">
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
        </button>
        
        <button 
          onClick={() => setSlotGame(prev => ({ ...prev, isActive: !prev.isActive }))}
          className="p-2 sm:p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title={slotGame.isActive ? "Disable Game" : "Enable Game"}
        >
          {slotGame.isActive ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Recharge Game">
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
          </svg>
        </button>
        
        <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Game Settings">
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button className="p-2 rounded-lg hover:bg-accent transition-colors" title="Game Analytics">
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
