'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
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
  // FIREKIRIN: Removed - firekirin.xyz:8888 redirects to google.com
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

export default function GameSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Staff users should see read-only games view
  // Redirect to games page instead of settings page
  useEffect(() => {
    if (user?.role === USER_ROLES.STAFF) {
      router.push('/dashboard/games');
    }
  }, [user?.role, router]);

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
    // Only fetch if not staff
    if (user?.role !== USER_ROLES.STAFF) {
      fetchGames();
    }
  }, [fetchGames, user?.role]);

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
        await fetchGames(); // Refresh the games list
        setEditingGame(null);
        alert('Game settings updated successfully!');
      }
    } catch (err) {
      console.error('Error updating game settings:', err);
      alert('Failed to update game settings');
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
      await fetchGames(); // Refresh the games list
      alert(`Game ${!game.game_status ? 'enabled' : 'disabled'} successfully!`);
    } catch (err) {
      console.error('Error toggling game status:', err);
      alert('Failed to update game status');
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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Game Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure game status and dashboard URLs
        </p>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <strong>Note:</strong> Games are manually created and cannot be created via API. Only updates are allowed.
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
  );
}
