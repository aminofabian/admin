'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { usePlayerGames } from '@/hooks/use-player-games';
import { usePlayerPurchases } from '@/hooks/use-player-purchases';
import { usePlayerCashouts } from '@/hooks/use-player-cashouts';
import { usePlayerGameActivities } from '@/hooks/use-player-game-activities';
import type { ChatUser } from '@/types';

interface PlayerInfoSidebarProps {
  selectedPlayer: ChatUser;
  isConnected: boolean;
  mobileView: 'list' | 'chat' | 'info';
  setMobileView: (view: 'list' | 'chat' | 'info') => void;
  notes: string;
  setNotes: (notes: string) => void;
  isSavingNotes: boolean;
  onNavigateToPlayer: () => void;
  onOpenEditBalance: () => void;
  onOpenEditProfile: () => void;
  onOpenAddGame: () => void;
  onSaveNotes: () => void;
}

export function PlayerInfoSidebar({
  selectedPlayer,
  isConnected,
  mobileView,
  setMobileView,
  notes,
  setNotes,
  isSavingNotes,
  onNavigateToPlayer,
  onOpenEditBalance,
  onOpenEditProfile,
  onOpenAddGame,
  onSaveNotes,
}: PlayerInfoSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { games, isLoading: isLoadingGames } = usePlayerGames(selectedPlayer.user_id || null);
  // Use the chat 'id' field (chatroom ID) for purchases and cashouts
  const { purchases, isLoading: isLoadingPurchases } = usePlayerPurchases(selectedPlayer.id || null);
  const { cashouts: allCashouts, isLoading: isLoadingCashouts } = usePlayerCashouts(selectedPlayer.id || null);
  // Use user_id for game activities
  const { activities: allActivities, isLoading: isLoadingActivities } = usePlayerGameActivities(selectedPlayer.user_id || null);

  // Filter cashouts and activities to only show data for the selected player
  const cashouts = allCashouts.filter(cashout => 
    cashout.user_id === selectedPlayer.user_id
  );
  
  const activities = allActivities.filter(activity => 
    activity.user_id === selectedPlayer.user_id
  );

  const toggleSection = (sectionName: string) => {
    setExpandedSection(expandedSection === sectionName ? null : sectionName);
  };
  return (
    <div className={`${mobileView === 'info' ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 flex-shrink-0 bg-gradient-to-b from-card to-card/50 flex-col border-l border-border/50`}>
      {/* Header with Player Avatar */}
      <div className="p-3 md:p-4 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
        {/* Back button for mobile */}
        <button
          onClick={() => setMobileView('chat')}
          className="md:hidden mb-3 p-2 hover:bg-muted rounded-lg transition-colors inline-flex items-center gap-2 text-muted-foreground"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Back to chat</span>
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2">
            <button
              onClick={onNavigateToPlayer}
              className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-lg md:text-xl font-bold shadow-lg ring-2 ring-primary/20 hover:ring-4 hover:ring-primary/30 transition-all cursor-pointer"
              title="View player profile"
            >
              {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
            </button>
            {isConnected && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card animate-pulse shadow-lg" />
            )}
          </div>
          <button
            onClick={onNavigateToPlayer}
            className="text-base md:text-lg font-bold text-foreground mb-0.5 hover:text-primary transition-colors cursor-pointer"
            title="View player profile"
          >
            {selectedPlayer.fullName || selectedPlayer.username}
          </button>
          <p className="text-xs text-muted-foreground mb-0.5">@{selectedPlayer.username}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-full px-2">
            {selectedPlayer.email || 'Email not available'}
          </p>
          {isConnected ? (
            <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-[10px] font-medium">
              <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-medium">
              <span className="w-1 h-1 bg-amber-500 rounded-full" />
              Connecting...
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {/* Financial Summary */}
        <div className="rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-sm text-foreground">Balance</h4>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-2 bg-background/50 rounded-md">
              <span className="text-xs text-muted-foreground">Total Balance</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(selectedPlayer.balance || '0')}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 rounded-md border border-yellow-500/20">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs text-foreground font-medium">Winnings</span>
              </div>
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-500">{formatCurrency(selectedPlayer.winningBalance || '0')}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="primary" 
            className="w-full shadow-md hover:shadow-lg transition-shadow text-xs py-2"
            onClick={onOpenEditBalance}
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Edit Balance
          </Button>
          <Button 
            variant="secondary" 
            className="w-full hover:bg-muted/50 text-xs py-2"
            onClick={onOpenEditProfile}
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Info
          </Button>
        </div>

        {/* Activity Sections */}
        <div className="rounded-lg bg-card border border-border p-3 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-sm text-foreground">Activity</h4>
          </div>
          {/* Purchases Section - Expandable */}
          <div className="w-full">
            <button
              onClick={() => toggleSection('purchases')}
              className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground">Purchases</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isLoadingPurchases ? 'Loading...' : `${purchases.length} items`}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all ${
                  expandedSection === 'purchases' ? 'rotate-90' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Expanded Purchases List */}
            {expandedSection === 'purchases' && (
              <div className="mt-1 pl-8 space-y-1 max-h-60 overflow-y-auto">
                {isLoadingPurchases ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="w-5 h-5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>
                ) : purchases.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No purchases found</p>
                ) : (
                  purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-foreground">{formatCurrency(purchase.amount.toString())}</p>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            purchase.status === 'completed'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : purchase.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              purchase.status === 'completed' 
                                ? 'bg-green-500' 
                                : purchase.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {purchase.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>ID: {purchase.transaction_id.slice(0, 8)}...</span>
                        <span>{purchase.operator}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Cashouts Section - Expandable */}
          <div className="w-full">
            <button
              onClick={() => toggleSection('cashouts')}
              className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground">Cashouts</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isLoadingCashouts ? 'Loading...' : `${cashouts.length} items`}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all ${
                  expandedSection === 'cashouts' ? 'rotate-90' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Expanded Cashouts List */}
            {expandedSection === 'cashouts' && (
              <div className="mt-1 pl-8 space-y-1 max-h-60 overflow-y-auto">
                {isLoadingCashouts ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="w-5 h-5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>
                ) : cashouts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No cashouts found</p>
                ) : (
                  cashouts.map((cashout) => (
                    <div
                      key={cashout.id}
                      className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-foreground">{formatCurrency(cashout.amount.toString())}</p>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            cashout.status === 'completed'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : cashout.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              cashout.status === 'completed' 
                                ? 'bg-green-500' 
                                : cashout.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {cashout.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>ID: {cashout.transaction_id.slice(0, 8)}...</span>
                        <span>{cashout.operator}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Game Activities Section - Expandable */}
          <div className="w-full">
            <button
              onClick={() => toggleSection('activities')}
              className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground">Game Activities</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isLoadingActivities ? 'Loading...' : `${activities.length} items`}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all ${
                  expandedSection === 'activities' ? 'rotate-90' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Expanded Game Activities List */}
            {expandedSection === 'activities' && (
              <div className="mt-1 pl-8 space-y-1 max-h-60 overflow-y-auto">
                {isLoadingActivities ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="w-5 h-5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No game activities found</p>
                ) : (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">{activity.game_title}</p>
                          <p className="text-[10px] text-muted-foreground">{activity.username}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            activity.status === 'completed'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : activity.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              activity.status === 'completed' 
                                ? 'bg-green-500' 
                                : activity.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {activity.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="capitalize">{activity.type.replace(/_/g, ' ')}</span>
                        <span>{formatCurrency(activity.total_amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Games Section - Expandable */}
          <div className="w-full">
            <button
              onClick={() => toggleSection('games')}
              className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground">Games</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isLoadingGames ? 'Loading...' : `${games.length} items`}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all ${
                  expandedSection === 'games' ? 'rotate-90' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Expanded Games List */}
            {expandedSection === 'games' && (
              <div className="mt-1 pl-8 space-y-1 max-h-60 overflow-y-auto">
                {isLoadingGames ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="w-5 h-5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>
                ) : games.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No games found</p>
                ) : (
                  games.map((game) => (
                    <div
                      key={game.id}
                      className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-foreground">{game.game__title}</p>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            game.status === 'active'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              game.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                            }`}
                          />
                          {game.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>ID: {game.game__id}</span>
                        <span>{new Date(game.created).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Game Button */}
        <Button 
          variant="primary" 
          className="w-full shadow-md hover:shadow-lg transition-shadow text-xs py-2"
          onClick={onOpenAddGame}
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Game
        </Button>

        {/* Notes Section */}
        <div className="rounded-lg bg-card border border-border p-3 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h4 className="font-semibold text-sm text-foreground">Notes</h4>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                onSaveNotes();
              }
            }}
            placeholder="Add private notes about this player..."
            className="w-full min-h-[80px] p-2.5 border border-border rounded-md bg-background dark:bg-background text-foreground text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="primary" 
              className="w-full text-xs py-2" 
              onClick={onSaveNotes}
              disabled={isSavingNotes}
            >
              {isSavingNotes ? (
                <svg className="w-3.5 h-3.5 mr-1.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isSavingNotes ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="secondary" className="w-full text-xs py-2" onClick={() => setNotes('')}>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
