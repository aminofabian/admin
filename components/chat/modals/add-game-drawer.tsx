'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button, Input } from '@/components/ui';
import { gamesApi } from '@/lib/api/games';
import type { Game, PlayerGame } from '@/types';

interface AddGameDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: number;
  playerUsername: string;
  playerGames: PlayerGame[];
  onSubmit: (data: { username: string; password: string; code: string; user_id: number }) => Promise<void>;
  isSubmitting: boolean;
}

export function AddGameDrawer({
  isOpen,
  onClose,
  playerId,
  playerUsername,
  playerGames,
  onSubmit,
  isSubmitting,
}: AddGameDrawerProps) {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  // Filter games to only show ones the player doesn't have yet
  const availableGames = useMemo(() => {
    // Get the game IDs the player already has
    const playerGameIds = new Set(playerGames.map(pg => pg.game__id));
    // Filter to only show games the player doesn't have
    return allGames.filter(game => !playerGameIds.has(game.id));
  }, [allGames, playerGames]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    code: '',
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when drawer opens
      setFormData({
        username: '',
        password: '',
        code: '',
      });

      // Fetch all games
      const fetchGames = async () => {
        setIsLoadingGames(true);
        try {
          const data = await gamesApi.list();
          // Handle paginated response with results array
          const games = Array.isArray(data) 
            ? data 
            : (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results))
              ? data.results
              : [];
          setAllGames(games);
        } catch (error) {
          console.error('Failed to fetch games:', error);
        } finally {
          setIsLoadingGames(false);
        }
      };

      fetchGames();
    }
  }, [isOpen]);

  const selectedGame = availableGames.find(game => game.code === formData.code);
  const isVegasSweeps = selectedGame?.title?.toLowerCase().includes('vegas sweeps') || 
                        selectedGame?.code?.toLowerCase().includes('vegas') ||
                        false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.username) {
      return;
    }

    // For Vegas Sweeps, password is not required
    if (!isVegasSweeps && !formData.password) {
      return;
    }

    await onSubmit({
      username: formData.username,
      password: isVegasSweeps ? '' : formData.password,
      code: formData.code,
      user_id: playerId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/80"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-[60] w-full sm:max-w-lg bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between z-10 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add New Game</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Add a game to player account</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:rotate-90 disabled:opacity-50"
              disabled={isSubmitting}
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24 md:pb-6">
          <form id="add-game-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Game Selection */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Select Game <span className="text-red-500">*</span>
              </label>
              {isLoadingGames ? (
                <div className="flex items-center justify-center py-4">
                  <svg className="w-5 h-5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                    <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
              ) : (
                <select
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Choose a game...</option>
                  {availableGames.length === 0 && !isLoadingGames && (
                    <option value="" disabled>No available games to add</option>
                  )}
                  {availableGames.map((game) => (
                    <option key={game.id} value={game.code}>
                      {game.title}
                    </option>
                  ))}
                </select>
              )}
              {selectedGame && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Code: {selectedGame.code}
                </p>
              )}
              {!isLoadingGames && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {availableGames.length === 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      Player already has all available games
                    </span>
                  ) : (
                    <>
                      {availableGames.length} game{availableGames.length !== 1 ? 's' : ''} available to add
                      {playerGames.length > 0 && ` (${playerGames.length} already added)`}
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Game Username <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username for the game"
                className="w-full"
                disabled={isSubmitting}
                required
                autoComplete="off"
                autoFocus={false}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The username that will be created in the game
              </p>
            </div>

            {/* Password - Hidden for Vegas Sweeps */}
            {!isVegasSweeps && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Game Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password for the game"
                  className="w-full"
                  disabled={isSubmitting}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The password for accessing the game account
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Player Information</p>
                  <p className="text-xs text-muted-foreground">
                    Adding a game for player: <span className="font-medium text-foreground">{playerUsername}</span>
                  </p>
                </div>
              </div>
            </div>

          </form>
          </div>

          {/* Drawer Footer */}
          <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-end gap-3 shadow-lg">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-game-form"
              variant="primary"
              disabled={isSubmitting || !formData.code || !formData.username || (!isVegasSweeps && !formData.password)}
              isLoading={isSubmitting}
              className="px-6 py-2.5 font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {isSubmitting ? 'Adding Game...' : 'Add Game'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
