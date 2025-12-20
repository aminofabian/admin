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
import { Modal, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import type { Game, UpdateGameSettingsRequest } from '@/types';

// Hardcoded dashboard URLs mapping by game title/code
const GAME_DASHBOARD_URLS: Record<string, string> = {
  GAMEROOM: 'https://agentserver.gameroom777.com',
  CASHMACHINE: 'https://agentserver.cashmachine777.com',
  MRALLINONE: 'https://agentserver.mrallinone777.com',
  MAFIA: 'https://agentserver.mafia77777.com',
  CASHFRENZY: 'https://agentserver.cashfrenzy777.com',
  KINGOFPOP: 'http://agentserver.slots88888.com:8003',
  GAMEVAULT: 'https://agent.gamevault999.com',
  VEGASSWEEPS: 'https://agent.lasvegassweeps.com',
  JUWA: 'https://ht.juwa777.com',
  ORIONSTARS: 'https://orionstars.vip:8781',
  PANDAMASTER: 'https://www.pandamaster.vip',
  MILKYWAY: 'https://milkywayapp.xyz:8781',
  FIREKIRIN: 'https://firekirin.xyz:8888',
  VBLINK: 'https://gm.vblink777.club',
  EGAME: 'https://pko.egame99.club',
  ULTRAPANDA: 'https://ht.ultrapanda.mobi',
  RIVERSWEEPS: 'https://river-pay.com',
};

/**
 * Get the dashboard URL for a game, checking both title and code (case-insensitive)
 */
function getGameDashboardUrl(game: Game): string | undefined {
  const titleUpper = game.title.toUpperCase().trim();
  const codeUpper = game.code?.toUpperCase().trim() ?? '';
  
  // Check by title first
  if (GAME_DASHBOARD_URLS[titleUpper]) {
    return GAME_DASHBOARD_URLS[titleUpper];
  }
  
  // Check by code
  if (codeUpper && GAME_DASHBOARD_URLS[codeUpper]) {
    return GAME_DASHBOARD_URLS[codeUpper];
  }
  
  // Fall back to stored dashboard_url if no hardcoded match
  return game.dashboard_url;
}

export function GameSettingsSection() {
  const { addToast } = useToast();
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    game_status: true,
    dashboard_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultiplierModalOpen, setIsMultiplierModalOpen] = useState(false);
  const [multiplierValue, setMultiplierValue] = useState('');
  const [isUpdatingMultiplier, setIsUpdatingMultiplier] = useState(false);
  const [multiplierError, setMultiplierError] = useState<string | null>(null);

  const {
    games: gamesData,
    minimumRedeemMultiplier,
    isLoading,
    error,
    fetchGames,
    updateMinimumRedeemMultiplier,
  } = useGamesStore();

  const {
    isLoading: isUpdating,
    updateGameSettings,
  } = useGameSettingsStore();

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    if (minimumRedeemMultiplier) {
      setMultiplierValue(minimumRedeemMultiplier);
    }
  }, [minimumRedeemMultiplier]);

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

  const games = gamesData || [];

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

      {/* Minimum Redeem Multiplier Card */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground dark:text-slate-400">Min Redeem Multiplier</div>
            <div className="mt-1 text-2xl font-semibold text-foreground dark:text-white">
              {minimumRedeemMultiplier || 'Not set'}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMultiplierValue(minimumRedeemMultiplier || '');
              setMultiplierError(null);
              setIsMultiplierModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
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
                        {getGameDashboardUrl(game) || 'Not configured'}
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

      <Modal
        isOpen={isMultiplierModalOpen}
        onClose={() => {
          setIsMultiplierModalOpen(false);
          setMultiplierValue(minimumRedeemMultiplier || '');
          setMultiplierError(null);
        }}
        title="Update Minimum Redeem Multiplier"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsMultiplierModalOpen(false);
                setMultiplierValue(minimumRedeemMultiplier || '');
                setMultiplierError(null);
              }}
              disabled={isUpdatingMultiplier}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const value = parseFloat(multiplierValue);
                if (isNaN(value) || value < 0) {
                  setMultiplierError('Please enter a valid number greater than or equal to 0');
                  return;
                }

                try {
                  setIsUpdatingMultiplier(true);
                  setMultiplierError(null);
                  await updateMinimumRedeemMultiplier(value);
                  setIsMultiplierModalOpen(false);
                  setMultiplierValue('');
                  addToast({
                    type: 'success',
                    title: 'Success',
                    description: 'Minimum redeem multiplier updated successfully',
                  });
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Failed to update multiplier';
                  setMultiplierError(message);
                } finally {
                  setIsUpdatingMultiplier(false);
                }
              }}
              disabled={isUpdatingMultiplier}
            >
              {isUpdatingMultiplier ? 'Updating...' : 'Update'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {multiplierError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {multiplierError}
            </div>
          )}
          
          <Input
            label="Minimum Redeem Multiplier"
            type="number"
            step="0.01"
            min="0"
            value={multiplierValue}
            onChange={(e) => setMultiplierValue(e.target.value)}
            placeholder="e.g., 1.00"
            disabled={isUpdatingMultiplier}
          />
        </div>
      </Modal>
    </div>
  );
}
