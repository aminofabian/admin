'use client';

import { useState, useEffect } from 'react';
import { useGamesStore, useGameSettingsStore } from '@/stores';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/features';
import type { Game, UpdateGameSettingsRequest } from '@/types';

export function GameSettingsSection() {
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    game_status: true,
    dashboard_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    games: gamesData,
    isLoading,
    error,
    fetchGames,
  } = useGamesStore();

  const {
    isLoading: isUpdating,
    updateGameSettings,
  } = useGameSettingsStore();

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      title: game.title || '',
      game_status: game.game_status ?? true,
      dashboard_url: game.dashboard_url || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingGame) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateGameSettingsRequest = {};
      
      if (formData.title !== editingGame.title) {
        updateData.title = formData.title;
      }
      if (formData.game_status !== editingGame.game_status) {
        updateData.game_status = formData.game_status;
      }
      if (formData.dashboard_url !== editingGame.dashboard_url) {
        updateData.dashboard_url = formData.dashboard_url;
      }

      if (Object.keys(updateData).length > 0) {
        await updateGameSettings(editingGame.id, updateData);
        await fetchGames();
        setEditingGame(null);
      }
    } catch (err) {
      console.error('Error updating game settings:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEditingGame(null);
    setFormData({
      title: '',
      game_status: true,
      dashboard_url: '',
    });
  };

  const handleToggleStatus = async (game: Game) => {
    try {
      await updateGameSettings(game.id, { game_status: !game.game_status });
      await fetchGames();
    } catch (err) {
      console.error('Error toggling game status:', err);
    }
  };

  if (isLoading && !gamesData) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchGames} />;
  }

  const games = gamesData?.results || [];

  return (
    <div className="space-y-6">
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Game Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Configure game status and dashboard URLs
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              <strong>Note:</strong> Games are manually created and cannot be created via API. Only updates are allowed.
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Game</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dashboard URL</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-12 text-gray-500 dark:text-gray-400" colSpan={6}>
                  No games found
                </TableCell>
              </TableRow>
            ) : (
              games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="font-medium">
                    {editingGame?.id === game.id ? (
                      <Input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full"
                      />
                    ) : (
                      game.title
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {game.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">
                      {game.game_category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingGame?.id === game.id ? (
                      <select
                        value={formData.game_status ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, game_status: e.target.value === 'true' })}
                        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(game)}
                        className="focus:outline-none"
                      >
                        <Badge variant={game.game_status ? 'success' : 'danger'}>
                          {game.game_status ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingGame?.id === game.id ? (
                      <Input
                        type="url"
                        value={formData.dashboard_url}
                        onChange={(e) => setFormData({ ...formData, dashboard_url: e.target.value })}
                        className="w-full"
                        placeholder="https://dashboard.example.com"
                      />
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {game.dashboard_url || 'Not configured'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingGame?.id === game.id ? (
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          onClick={handleSubmit}
                          disabled={isSubmitting || isUpdating}
                        >
                          {isSubmitting || isUpdating ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleCancel}
                          disabled={isSubmitting || isUpdating}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(game)}
                        className="text-[#6366f1] dark:text-[#6366f1] hover:text-[#5558e3] dark:hover:text-[#5558e3]"
                      >
                        Edit
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
