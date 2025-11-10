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
  onGameAdded: () => void;
  onSubmit: (data: { username: string; password: string; code: string; user_id: number }) => Promise<void>;
  isSubmitting: boolean;
}

export function AddGameDrawer({
  isOpen,
  onClose,
  playerId,
  playerUsername,
  playerGames,
  onGameAdded,
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
        username: playerUsername || '',
        password: '',
        code: '',
      });

      // Fetch all games
      const fetchGames = async () => {
        setIsLoadingGames(true);
        try {
          const data = await gamesApi.list();
          setAllGames(data);
        } catch (error) {
          console.error('Failed to fetch games:', error);
        } finally {
          setIsLoadingGames(false);
        }
      };

      fetchGames();
    }
  }, [isOpen, playerUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.username || !formData.password) {
      return;
    }

    await onSubmit({
      username: formData.username,
      password: formData.password,
      code: formData.code,
      user_id: playerId,
    });
  };

  const selectedGame = availableGames.find(game => game.code === formData.code);

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Add New Game</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-73px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The username that will be created in the game
              </p>
            </div>

            {/* Password */}
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

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-6"
              disabled={isSubmitting || !formData.code || !formData.username || !formData.password}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                    <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  Adding Game...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Game
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
