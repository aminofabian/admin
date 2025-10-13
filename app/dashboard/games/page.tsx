'use client';

import { useState, useEffect } from 'react';
// import { gamesApi } from '@/lib/api'; // Suspended for mock data
import { usePagination, useSearch } from '@/lib/hooks';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Badge,
  Pagination,
  SearchInput,
  Button,
  Modal,
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState, GameForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Game, PaginatedResponse, UpdateGameRequest } from '@/types';

// 🎭 MOCK DATA - Remove when backend is ready
const MOCK_GAMES: Game[] = [
  {
    id: 1,
    title: 'Dragon Fortune Slots',
    code: 'DFS001',
    game_category: 'slots',
    game_status: true,
    dashboard_url: 'https://dashboard.dragonfortune.com',
    created: '2024-01-10T08:00:00Z',
  },
  {
    id: 2,
    title: 'Mega Jackpot Poker',
    code: 'MJP002',
    game_category: 'poker',
    game_status: true,
    dashboard_url: 'https://dashboard.megajackpot.com',
    created: '2024-01-15T09:30:00Z',
  },
  {
    id: 3,
    title: 'Lucky Roulette Pro',
    code: 'LRP003',
    game_category: 'roulette',
    game_status: false,
    dashboard_url: 'https://dashboard.luckyroulette.com',
    created: '2024-02-01T10:15:00Z',
  },
  {
    id: 4,
    title: 'Blackjack Master',
    code: 'BJM004',
    game_category: 'blackjack',
    game_status: true,
    dashboard_url: 'https://dashboard.blackjackmaster.com',
    created: '2024-02-10T11:45:00Z',
  },
  {
    id: 5,
    title: 'Treasure Quest Slots',
    code: 'TQS005',
    game_category: 'slots',
    game_status: true,
    created: '2024-02-20T14:20:00Z',
  },
  {
    id: 6,
    title: 'Baccarat Royal',
    code: 'BAC006',
    game_category: 'baccarat',
    game_status: false,
    dashboard_url: 'https://dashboard.baccaratroyal.com',
    created: '2024-03-01T15:30:00Z',
  },
  {
    id: 7,
    title: 'Cosmic Spins',
    code: 'CSP007',
    game_category: 'slots',
    game_status: true,
    dashboard_url: 'https://dashboard.cosmicspins.com',
    created: '2024-03-15T16:00:00Z',
  },
  {
    id: 8,
    title: 'Texas Holdem Elite',
    code: 'THE008',
    game_category: 'poker',
    game_status: true,
    created: '2024-03-20T17:45:00Z',
  },
  {
    id: 9,
    title: 'European Roulette',
    code: 'EUR009',
    game_category: 'roulette',
    game_status: false,
    dashboard_url: 'https://dashboard.euroulette.com',
    created: '2024-04-01T09:00:00Z',
  },
  {
    id: 10,
    title: 'Wild West Slots',
    code: 'WWS010',
    game_category: 'slots',
    game_status: true,
    dashboard_url: 'https://dashboard.wildwest.com',
    created: '2024-04-10T10:30:00Z',
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
const mockGamesApi = {
  list: async (filters?: { search?: string; page?: number; page_size?: number }): Promise<PaginatedResponse<Game>> => {
    await delay(800); // Simulate network delay

    let filteredGames = [...MOCK_GAMES];

    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredGames = filteredGames.filter(
        (game) =>
          game.title.toLowerCase().includes(searchLower) ||
          game.code.toLowerCase().includes(searchLower) ||
          game.game_category.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedGames = filteredGames.slice(startIndex, endIndex);

    return {
      count: filteredGames.length,
      next: endIndex < filteredGames.length ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: paginatedGames,
    };
  },

  update: async (id: number, data: UpdateGameRequest): Promise<Game> => {
    await delay(1000); // Simulate network delay

    const gameIndex = MOCK_GAMES.findIndex((g) => g.id === id);
    if (gameIndex === -1) {
      throw new Error('Game not found');
    }

    MOCK_GAMES[gameIndex] = {
      ...MOCK_GAMES[gameIndex],
      ...data,
    };

    return MOCK_GAMES[gameIndex];
  },
};

export default function GamesPage() {
  const [data, setData] = useState<PaginatedResponse<Game> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();

  useEffect(() => {
    loadGames();
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      setError('');
      // Using mock API - replace with gamesApi.list when backend is ready
      const response = await mockGamesApi.list({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGame = async (formData: UpdateGameRequest) => {
    if (!selectedGame) return;
    
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      // Using mock API - replace with gamesApi.update when backend is ready
      await mockGamesApi.update(selectedGame.id, formData);
      
      setSuccessMessage('Game updated successfully!');
      setIsEditModalOpen(false);
      setSelectedGame(null);
      await loadGames();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update game';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (game: Game) => {
    if (!confirm(`Are you sure you want to ${game.game_status ? 'disable' : 'enable'} ${game.title}?`)) {
      return;
    }

    try {
      // Using mock API - replace with gamesApi.update when backend is ready
      await mockGamesApi.update(game.id, { game_status: !game.game_status });
      setSuccessMessage(`Game ${game.game_status ? 'disabled' : 'enabled'} successfully!`);
      await loadGames();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update game status');
    }
  };

  const openEditModal = (game: Game) => {
    setSelectedGame(game);
    setIsEditModalOpen(true);
    setSubmitError('');
  };

  const closeModals = () => {
    setIsEditModalOpen(false);
    setSelectedGame(null);
    setSubmitError('');
  };

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={loadGames} />;
  }

  return (
    <div>
      {/* Mock Data Banner */}
      <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span><strong>Development Mode:</strong> Using mock data. Changes persist in memory only (refresh to reset).</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Games</h1>
        <div className="bg-gray-100 px-4 py-2 rounded-md text-sm text-gray-600">
          <strong>Note:</strong> Games are manually created by system admins
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Games</h2>
            <div className="w-64">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <EmptyState 
              title="No games found" 
              description="No games available in the system"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="font-medium">{game.title}</TableCell>
                      <TableCell className="font-mono text-sm">{game.code}</TableCell>
                      <TableCell>
                        <span className="capitalize">{game.game_category}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={game.game_status ? 'success' : 'danger'}>
                          {game.game_status ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(game.created)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(game)}
                            title="Edit game"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            size="sm"
                            variant={game.game_status ? 'danger' : 'secondary'}
                            onClick={() => handleToggleStatus(game)}
                            title={game.game_status ? 'Disable' : 'Enable'}
                          >
                            {game.game_status ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data && (
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(data.count / pageSize)}
                  onPageChange={setPage}
                  hasNext={!!data.next}
                  hasPrevious={!!data.previous}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Game Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Game"
        size="md"
      >
        {submitError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3">
            {submitError}
          </div>
        )}
        {selectedGame && (
          <GameForm
            game={selectedGame}
            onSubmit={handleUpdateGame}
            onCancel={closeModals}
            isLoading={isSubmitting}
          />
        )}
      </Modal>
    </div>
  );
}
