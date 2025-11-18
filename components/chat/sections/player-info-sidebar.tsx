'use client';

import { useState, memo, useCallback } from 'react';
import { Button, DropdownMenu, DropdownMenuItem, ConfirmModal, useToast } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { usePlayerGames } from '@/hooks/use-player-games';
import { usePlayerPurchases } from '@/hooks/use-player-purchases';
import { usePlayerCashouts } from '@/hooks/use-player-cashouts';
import { usePlayerGameActivities } from '@/hooks/use-player-game-activities';
import { PlayerInfoSkeleton } from '../components/chat-skeletons';
import { PlayerGameBalanceModal } from '@/components/features';
import { playersApi } from '@/lib/api/users';
import type { ChatUser, PlayerGame, CheckPlayerGameBalanceResponse } from '@/types';

interface PlayerInfoSidebarProps {
  selectedPlayer: ChatUser;
  isConnected: boolean;
  mobileView: 'list' | 'chat' | 'info';
  setMobileView: (view: 'list' | 'chat' | 'info') => void;
  notes: string;
  onNavigateToPlayer: () => void;
  onOpenEditBalance: () => void;
  onOpenEditProfile: () => void;
  onOpenNotesDrawer: () => void;
}

export const PlayerInfoSidebar = memo(function PlayerInfoSidebar({
  selectedPlayer,
  isConnected,
  mobileView,
  setMobileView,
  notes,
  onNavigateToPlayer,
  onOpenEditBalance,
  onOpenEditProfile,
  onOpenNotesDrawer,
}: PlayerInfoSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { games, isLoading: isLoadingGames, refreshGames } = usePlayerGames(selectedPlayer.user_id || null);
  const { addToast } = useToast();
  
  const [gameToDelete, setGameToDelete] = useState<PlayerGame | null>(null);
  const [isDeletingGame, setIsDeletingGame] = useState(false);
  const [gameToChange, setGameToChange] = useState<PlayerGame | null>(null);
  const [isChangingGame, setIsChangingGame] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedGameForBalance, setSelectedGameForBalance] = useState<PlayerGame | null>(null);
  const [balanceData, setBalanceData] = useState<CheckPlayerGameBalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
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

  const handleDeleteGame = useCallback(async () => {
    if (!gameToDelete) return;

    setIsDeletingGame(true);
    try {
      await playersApi.deleteGame(gameToDelete.id);
      await refreshGames();
      addToast({
        type: 'success',
        title: 'Game removed',
        description: `"${gameToDelete.game__title}" has been removed from player "${selectedPlayer.username}".`,
      });
      setGameToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete game';
      addToast({
        type: 'error',
        title: 'Delete failed',
        description: message,
      });
    } finally {
      setIsDeletingGame(false);
    }
  }, [gameToDelete, selectedPlayer, refreshGames, addToast]);

  const handleChangeGame = useCallback(async () => {
    if (!gameToChange) return;

    setIsChangingGame(true);
    try {
      // Toggle the game status
      // API requires username, so we send the current username along with status
      const newStatus = gameToChange.status === 'active' ? 'inactive' : 'active';
      await playersApi.updateGame(gameToChange.id, { 
        username: gameToChange.username,
        status: newStatus 
      });
      await refreshGames();
      addToast({
        type: 'success',
        title: 'Game updated',
        description: `"${gameToChange.game__title}" status has been changed to ${newStatus}.`,
      });
      setGameToChange(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update game';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setIsChangingGame(false);
    }
  }, [gameToChange, refreshGames, addToast]);
  return (
    <div className={`${mobileView === 'info' ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 flex-shrink-0 bg-gradient-to-b from-card to-card/50 flex-col border-l border-border/50`}>
      {/* Header with Player Avatar - Compact */}
      <div className="p-3 border-b border-border/50 bg-card/50">
        {/* Back button for mobile */}
        <button
          onClick={() => setMobileView('chat')}
          className="md:hidden mb-2 p-1.5 hover:bg-muted/50 rounded transition-colors inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs">Back</span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <button
              onClick={onNavigateToPlayer}
              className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
              title="View player profile"
            >
              {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
            </button>
            {isConnected && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card shadow-sm" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <button
              onClick={onNavigateToPlayer}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer truncate block w-full text-left"
              title="View player profile"
            >
              {selectedPlayer.fullName || selectedPlayer.username}
            </button>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[10px] text-muted-foreground truncate">@{selectedPlayer.username}</p>
              {isConnected ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-[9px] font-medium shrink-0">
                  <span className="w-1 h-1 bg-green-500 rounded-full" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[9px] font-medium shrink-0">
                  <span className="w-1 h-1 bg-amber-500 rounded-full" />
                  Offline
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {selectedPlayer.email || 'No email'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Financial Summary - Compact */}
        <div className="rounded-lg border border-border/50 bg-card/50 p-2.5">
          
          <div className="grid grid-cols-2 gap-2">
            {/* Credits */}
            <div className="rounded-md bg-blue-500/5 border border-blue-500/20 p-2">
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[9px] font-medium text-muted-foreground uppercase">Credits</span>
              </div>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(selectedPlayer.balance || '0')}
              </p>
            </div>

            {/* Winnings */}
            <div className="rounded-md bg-yellow-500/5 border border-yellow-500/20 p-2">
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-[9px] font-medium text-muted-foreground uppercase">Winnings</span>
              </div>
              <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500">
                {formatCurrency(selectedPlayer.winningBalance || '0')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full">
          <Button 
            variant="primary" 
            className="w-full text-xs py-1.5 h-8"
            onClick={onOpenEditBalance}
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Balance
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
                  purchases.map((purchase) => {
                    // Parse bonus amount - handle both string and number formats
                    const bonusAmount = purchase.bonus_amount 
                      ? (typeof purchase.bonus_amount === 'string' 
                          ? parseFloat(purchase.bonus_amount) 
                          : purchase.bonus_amount)
                      : null;
                    const hasBonus = bonusAmount !== null && !isNaN(bonusAmount) && bonusAmount > 0;

                    return (
                      <div
                        key={purchase.id}
                        className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        {/* Amount and Status Row */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-left">
                            <p className="text-xs font-bold text-foreground">{formatCurrency(purchase.amount.toString())}</p>
                            {hasBonus && (
                              <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                Bonus: {formatCurrency(bonusAmount.toString())}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
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
                        {/* Payment method row */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{purchase.payment_method || '—'}</span>
                        </div>
                      </div>
                    );
                  })
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
                      {/* Amount and Status Row */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-left">
                          <p className="text-xs font-bold text-foreground">{formatCurrency(cashout.amount.toString())}</p>
                          {cashout.bonus_amount && cashout.bonus_amount > 0 && (
                            <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                              Bonus: {formatCurrency(cashout.bonus_amount.toString())}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
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
                      {/* Payment method row */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{cashout.payment_method || cashout.operator}</span>
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
                  activities.map((activity) => {
                    // Determine activity type and what to display
                    const activityType = activity.type.toLowerCase();
                    const isRechargeActivity = activityType === 'recharge_game';
                    const isRedeemActivity = activityType === 'redeem_game';
                    const isResetActivity = activityType.includes('reset') || activityType.includes('clear');
                    
                    // Parse bonus amount - handle both string and number formats
                    const bonusAmount = activity.bonus_amount 
                      ? (typeof activity.bonus_amount === 'string' 
                          ? parseFloat(activity.bonus_amount) 
                          : activity.bonus_amount)
                      : null;
                    const hasBonus = bonusAmount !== null && !isNaN(bonusAmount) && bonusAmount > 0;

                    // Format activity type for display
                    const formattedActivityType = activity.type.replace(/_/g, ' ');

                    return (
                      <div
                        key={activity.id}
                        className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        {/* Row 1: Game Title and Status */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-foreground">{activity.game_title}</p>
                          </div>

                          {/* Status badge - always shown */}
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
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

                        {/* Row 2: Activity Type (always shown) + Game Username (for Recharge/Redeem/Reset) */}
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {formattedActivityType}
                          </p>
                          {(isRechargeActivity || isRedeemActivity || isResetActivity) && activity.username && (
                            <p className="text-[10px] text-muted-foreground">
                              • {activity.username}
                            </p>
                          )}
                        </div>

                        {/* Row 3: Amount/Bonus (only for Recharge and Redeem) */}
                        {(isRechargeActivity || isRedeemActivity) && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>Amount: {formatCurrency(activity.amount || '0')}</span>
                            {hasBonus && (
                              <span className="text-green-600 dark:text-green-400">
                                Bonus: {formatCurrency(bonusAmount.toString())}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Games Section - Expandable - Hidden */}
          {false && <div className="w-full">
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

            {expandedSection === 'games' && (
              <div className="mt-2 pl-8 space-y-2 max-h-60 overflow-y-auto pr-1">
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
                      className="group relative p-3 bg-gradient-to-br from-background to-muted/20 rounded-lg border border-border/60 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {/* Game Title Row */}
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-foreground truncate leading-tight">{game.game__title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">ID: {game.game__id}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border ${
                              game.status === 'active'
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 dark:border-green-500/30'
                                : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 dark:border-gray-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                game.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                              }`}
                            />
                            {game.status}
                          </span>
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-1.5 flex-1">
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedGameForBalance(game);
                              setBalanceError(null);
                              setBalanceData(null);
                              setIsBalanceModalOpen(true);
                              
                              try {
                                setIsCheckingBalance(true);
                                const response = await playersApi.checkGameBalance({
                                  game_id: game.game__id,
                                  player_id: selectedPlayer.user_id,
                                });
                                setBalanceData(response);
                              } catch (err) {
                                const message = err instanceof Error ? err.message : 'Failed to check game balance';
                                setBalanceError(message);
                              } finally {
                                setIsCheckingBalance(false);
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-md border border-blue-200/50 dark:border-blue-800/50 transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
                            title="Fetch Balance"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Balance</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(game.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <DropdownMenu
                            trigger={
                              <button
                                type="button"
                                className="flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all border border-transparent hover:border-border/50"
                                aria-label="Game actions"
                                title="More actions"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            }
                            align="right"
                          >
                            <DropdownMenuItem
                              onClick={async () => {
                                setSelectedGameForBalance(game);
                                setBalanceError(null);
                                setBalanceData(null);
                                setIsBalanceModalOpen(true);
                                
                                try {
                                  setIsCheckingBalance(true);
                                  const response = await playersApi.checkGameBalance({
                                    game_id: game.game__id,
                                    player_id: selectedPlayer.user_id,
                                  });
                                  setBalanceData(response);
                                } catch (err) {
                                  const message = err instanceof Error ? err.message : 'Failed to check game balance';
                                  setBalanceError(message);
                                } finally {
                                  setIsCheckingBalance(false);
                                }
                              }}
                            >
                              Fetch Balance
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setGameToChange(game)}
                            >
                              Change
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setGameToDelete(game)}
                              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>}
        </div>

      </div>

      {/* Modals */}
      <PlayerGameBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={() => {
          setIsBalanceModalOpen(false);
          setSelectedGameForBalance(null);
          setBalanceData(null);
          setBalanceError(null);
        }}
        gameTitle={selectedGameForBalance?.game__title || ''}
        playerUsername={selectedPlayer.username}
        balanceData={balanceData}
        isLoading={isCheckingBalance}
        error={balanceError}
      />

      <ConfirmModal
        isOpen={!!gameToDelete}
        onClose={() => setGameToDelete(null)}
        onConfirm={handleDeleteGame}
        title="Delete Game"
        description={`Are you sure you want to remove "${gameToDelete?.game__title}" from "${selectedPlayer?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeletingGame}
      />

      <ConfirmModal
        isOpen={!!gameToChange}
        onClose={() => setGameToChange(null)}
        onConfirm={handleChangeGame}
        title="Change Game Status"
        description={`Are you sure you want to change the status of "${gameToChange?.game__title}" to ${gameToChange?.status === 'active' ? 'inactive' : 'active'}?`}
        confirmText="Change"
        variant="info"
        isLoading={isChangingGame}
      />
    </div>
  );
});
