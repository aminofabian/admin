'use client';

import { useState, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConfirmModal, useToast } from '@/components/ui';
import { formatCurrency, formatPaymentMethod } from '@/lib/utils/formatters';
import { usePlayerPurchases } from '@/hooks/use-player-purchases';
import { usePlayerCashouts } from '@/hooks/use-player-cashouts';
import { usePlayerGameActivities } from '@/hooks/use-player-game-activities';
import { PlayerGameBalanceModal } from '@/components/features';
import { playersApi } from '@/lib/api/users';
import type { ChatUser, PlayerGame, CheckPlayerGameBalanceResponse } from '@/types';
import { hasMeaningfulWinningBalance } from '@/lib/chat/map-chat-api';
import { PlayerRouletteSpinBalanceDisplay } from '@/components/dashboard/players/player-roulette-spin-balance-display';

interface PlayerInfoSidebarProps {
  selectedPlayer: ChatUser;
  mobileView: 'list' | 'chat' | 'info';
  setMobileView: (view: 'list' | 'chat' | 'info') => void;
  notes: string;
  onNavigateToPlayer: () => void;
  onOpenEditBalance: () => void;
  onOpenEditSpins: () => void;
  onOpenEditProfile: () => void;
  spinBalanceRefreshKey?: number;
  onOpenNotesDrawer: () => void;
}

export const PlayerInfoSidebar = memo(function PlayerInfoSidebar({
  selectedPlayer,
  mobileView,
  setMobileView,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notes: _notes,
  onNavigateToPlayer,
  onOpenEditBalance,
  onOpenEditSpins,
  spinBalanceRefreshKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onOpenEditProfile: _onOpenEditProfile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onOpenNotesDrawer: _onOpenNotesDrawer,
}: PlayerInfoSidebarProps) {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { addToast } = useToast();

  // Games section is hidden - removed usePlayerGames hook to prevent unnecessary API calls
  const [gameToDelete, setGameToDelete] = useState<PlayerGame | null>(null);
  const [isDeletingGame, setIsDeletingGame] = useState(false);
  const [gameToChange, setGameToChange] = useState<PlayerGame | null>(null);
  const [isChangingGame, setIsChangingGame] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedGameForBalance, setSelectedGameForBalance] = useState<PlayerGame | null>(null);
  const [balanceData, setBalanceData] = useState<CheckPlayerGameBalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isCheckingBalance] = useState(false);
  // Use the chat 'id' field (chatroom ID) for purchases and cashouts
  // Pass player info for real-time websocket matching
  const { purchases, isLoading: isLoadingPurchases } = usePlayerPurchases(
    selectedPlayer.id || null,
    selectedPlayer.username,
    selectedPlayer.email,
    selectedPlayer.user_id
  );
  const { cashouts: allCashouts, isLoading: isLoadingCashouts } = usePlayerCashouts(
    selectedPlayer.id || null,
    selectedPlayer.username,
    selectedPlayer.email,
    selectedPlayer.user_id
  );
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
      // Games section is hidden - refreshGames removed
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
  }, [gameToDelete, selectedPlayer, addToast]);

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
      // Games section is hidden - refreshGames removed
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
  }, [gameToChange, addToast]);
  return (
    <div
      className={`${mobileView === 'info' ? 'flex' : 'hidden'} md:flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-l border-border/40 bg-muted/20 md:w-64 md:bg-gradient-to-b md:from-card md:to-card/50 lg:w-72`}
    >
      {/* Header — profile */}
      <div className="shrink-0 border-b border-border/40 bg-card/90 px-3 pb-3 pt-2 backdrop-blur-sm md:px-2 md:pb-2 md:pt-2">
        <button
          type="button"
          onClick={() => setMobileView('chat')}
          className="md:hidden mb-3 flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground active:bg-muted"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/80">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          <span className="text-sm font-medium">Back to chat</span>
        </button>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm md:rounded-xl md:p-2.5">
          <div className="flex gap-3 md:gap-2">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={onNavigateToPlayer}
                className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-md shadow-blue-500/25 ring-2 ring-white/30 transition-transform active:scale-[0.98] dark:ring-white/10 md:h-10 md:w-10 md:rounded-lg md:text-xs"
                title="Open full profile"
              >
                {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
              </button>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-[2.5px] border-card shadow-sm md:h-2 md:w-2 md:border-2 ${selectedPlayer.isOnline ? 'bg-primary' : 'bg-muted-foreground/60'}`}
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <button
                type="button"
                onClick={onNavigateToPlayer}
                className="flex w-full min-w-0 flex-col items-stretch gap-0.5 text-left"
                title="Open full profile"
              >
                <span className="truncate text-sm font-semibold capitalize leading-tight text-foreground md:text-xs">
                  {selectedPlayer.fullName || selectedPlayer.username}
                </span>
                <span className="truncate text-sm font-normal leading-tight tracking-normal text-muted-foreground md:text-xs">
                  @{selectedPlayer.username}
                </span>
              </button>
              <p className="truncate text-xs leading-tight text-muted-foreground md:text-[10px]">
                {selectedPlayer.email || 'No email on file'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-y-contain px-3 py-3 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] md:space-y-2 md:p-2 md:pb-2">
        {/* Wallet */}
        <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm md:rounded-lg md:p-2">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:mb-2">
            Wallet
          </p>
          <div
            className={`grid gap-3 ${hasMeaningfulWinningBalance(selectedPlayer.winningBalance) ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <div className="rounded-xl bg-blue-500/[0.07] p-3 ring-1 ring-blue-500/15 md:rounded-md md:p-1.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 md:h-5 md:w-5 md:rounded">
                  <svg className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 md:h-3 md:w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Balance</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400 md:text-sm">
                {formatCurrency(selectedPlayer.balance || '0')}
              </p>
            </div>

            {hasMeaningfulWinningBalance(selectedPlayer.winningBalance) ? (
              <div className="rounded-xl bg-amber-500/[0.07] p-3 ring-1 ring-amber-500/15 md:rounded-md md:p-1.5">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 md:h-5 md:w-5 md:rounded">
                    <svg className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 md:h-3 md:w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Winnings</span>
                </div>
                <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400 md:text-sm">
                  {formatCurrency(selectedPlayer.winningBalance || '0')}
                </p>
              </div>
            ) : null}
          </div>
          {selectedPlayer.cashoutLimit !== undefined && selectedPlayer.cashoutLimit !== '' ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 md:mt-2 md:rounded-md md:px-2 md:py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cashout limit</span>
              <p className="text-sm font-bold tabular-nums text-foreground md:text-xs">
                {formatCurrency(selectedPlayer.cashoutLimit)}
              </p>
            </div>
          ) : null}
          <PlayerRouletteSpinBalanceDisplay
            playerId={selectedPlayer.user_id}
            variant="inline"
            refreshKey={spinBalanceRefreshKey}
          />
        </section>

        <div className="flex w-full flex-col gap-2">
          <Button
            variant="primary"
            className="h-12 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/20 md:h-8 md:rounded-md md:text-xs md:shadow-none"
            onClick={onOpenEditBalance}
          >
            <svg className="mr-2 h-4 w-4 md:mr-1 md:h-3 md:w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Adjust balance
          </Button>
          <Button
            variant="primary"
            className="h-12 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/20 md:h-8 md:rounded-md md:text-xs md:shadow-none"
            onClick={onOpenEditSpins}
          >
            <svg className="mr-2 h-4 w-4 md:mr-1 md:h-3 md:w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Adjust spins
          </Button>
        </div>

        {/* Activity */}
        <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm md:rounded-lg">
          <div className="flex items-center gap-2.5 border-b border-border/40 bg-muted/30 px-4 py-3 md:px-3 md:py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 md:h-6 md:w-6 md:rounded-md">
              <svg className="h-5 w-5 text-violet-600 dark:text-violet-400 md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <h4 className="text-sm font-semibold text-foreground md:text-xs">Activity</h4>
              <p className="text-[11px] text-muted-foreground md:hidden">Purchases, cashouts &amp; games</p>
            </div>
          </div>
          <div className="divide-y divide-border/40 p-2 md:divide-y-0 md:space-y-1 md:p-3 md:pt-2">
          {/* Purchases */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => toggleSection('purchases')}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/60 active:bg-muted/80 md:min-h-0 md:rounded-md md:p-2 md:hover:bg-muted/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted md:h-6 md:w-6 md:rounded-md">
                  <svg className="h-5 w-5 text-muted-foreground md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground md:text-xs">Purchases</p>
                  <p className="text-xs text-muted-foreground md:text-[10px]">
                    {isLoadingPurchases ? 'Loading…' : `${purchases.length} ${purchases.length === 1 ? 'item' : 'items'}`}
                  </p>
                </div>
              </div>
              <svg
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform md:h-3.5 md:w-3.5 ${expandedSection === 'purchases' ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {expandedSection === 'purchases' && (
              <div className="mx-2 mb-3 max-h-60 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-2 md:mx-0 md:mb-0 md:mt-1 md:space-y-1 md:rounded-md md:bg-transparent md:p-0 md:pl-8">
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
                        onClick={() => router.push('/dashboard/processing/purchase')}
                        className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
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
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${purchase.status === 'completed'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : purchase.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                              }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${purchase.status === 'completed'
                                ? 'bg-green-500'
                                : purchase.status === 'pending'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                                }`}
                            />
                            {purchase.status.toUpperCase()}
                          </span>
                        </div>
                        {/* Payment method row */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{formatPaymentMethod(purchase.payment_method)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Cashouts */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => toggleSection('cashouts')}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/60 active:bg-muted/80 md:min-h-0 md:rounded-md md:p-2 md:hover:bg-muted/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted md:h-6 md:w-6 md:rounded-md">
                  <svg className="h-5 w-5 text-muted-foreground md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground md:text-xs">Cashouts</p>
                  <p className="text-xs text-muted-foreground md:text-[10px]">
                    {isLoadingCashouts ? 'Loading…' : `${cashouts.length} ${cashouts.length === 1 ? 'item' : 'items'}`}
                  </p>
                </div>
              </div>
              <svg
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform md:h-3.5 md:w-3.5 ${expandedSection === 'cashouts' ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {expandedSection === 'cashouts' && (
              <div className="mx-2 mb-3 max-h-60 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-2 md:mx-0 md:mb-0 md:mt-1 md:space-y-1 md:rounded-md md:bg-transparent md:p-0 md:pl-8">
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
                      onClick={() => router.push('/dashboard/processing/cashout')}
                      className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
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
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${cashout.status === 'completed'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : cashout.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${cashout.status === 'completed'
                              ? 'bg-green-500'
                              : cashout.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                              }`}
                          />
                          {cashout.status.toUpperCase()}
                        </span>
                      </div>
                      {/* Payment method row */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{formatPaymentMethod(cashout.payment_method || cashout.operator)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Game activities */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => toggleSection('activities')}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/60 active:bg-muted/80 md:min-h-0 md:rounded-md md:p-2 md:hover:bg-muted/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted md:h-6 md:w-6 md:rounded-md">
                  <svg className="h-5 w-5 text-muted-foreground md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground md:text-xs">Game activities</p>
                  <p className="text-xs text-muted-foreground md:text-[10px]">
                    {isLoadingActivities ? 'Loading…' : `${activities.length} ${activities.length === 1 ? 'item' : 'items'}`}
                  </p>
                </div>
              </div>
              <svg
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform md:h-3.5 md:w-3.5 ${expandedSection === 'activities' ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {expandedSection === 'activities' && (
              <div className="mx-2 mb-2 max-h-60 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-2 md:mx-0 md:mb-0 md:mt-1 md:space-y-1 md:rounded-md md:bg-transparent md:p-0 md:pl-8">
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

                    // Extract additional data from new structure
                    const activityData = activity.data || {};
                    const gameUsername = activity.game_username || activityData.username;

                    return (
                      <div
                        key={activity.id}
                        onClick={() => router.push('/dashboard/processing/game-activities')}
                        className="p-2 bg-background/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        {/* Row 1: Game Title and Status */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {activity.game_title || 'Unknown Game'}
                            </p>
                          </div>

                          {/* Status badge - always shown */}
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${activity.status === 'completed'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : activity.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : activity.status === 'failed'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                              }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${activity.status === 'completed'
                                ? 'bg-green-500'
                                : activity.status === 'pending'
                                  ? 'bg-amber-500'
                                  : activity.status === 'failed'
                                    ? 'bg-red-500'
                                    : 'bg-gray-500'
                                }`}
                            />
                            {activity.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Row 2: Activity Type (always shown) + Game Username (for Recharge/Redeem/Reset) */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {formattedActivityType}
                          </p>
                          {(isRechargeActivity || isRedeemActivity || isResetActivity) &&
                            gameUsername &&
                            gameUsername.toLowerCase() !== (activity.game_title || '').toLowerCase() && (
                              <p className="text-[10px] text-muted-foreground">
                                • {gameUsername}
                              </p>
                            )}
                        </div>

                        {/* Row 3: Amount/Bonus (only for Recharge and Redeem) */}
                        {(isRechargeActivity || isRedeemActivity) && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1 flex-wrap">
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
          </div>
        </section>

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
