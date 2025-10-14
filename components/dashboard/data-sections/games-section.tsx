'use client';

import { useEffect, useState } from 'react';
import type { Game, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge } from '@/components/ui';

export function GamesSection() {
  const [data, setData] = useState<PaginatedResponse<Game> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData: PaginatedResponse<Game> = {
        count: 45,
        next: null,
        previous: null,
        results: [
          { id: 1, title: 'Mega Fortune Slots', code: 'MFS001', game_category: 'slots', game_status: true, created: '2024-01-15T10:30:00Z' },
          { id: 2, title: 'Lucky Slots', code: 'LS002', game_category: 'slots', game_status: true, created: '2024-01-16T11:45:00Z' },
          { id: 3, title: 'Blackjack Classic', code: 'BJC003', game_category: 'table', game_status: true, created: '2024-01-17T09:20:00Z' },
          { id: 4, title: 'Roulette Pro', code: 'RP004', game_category: 'table', game_status: false, created: '2024-01-18T14:30:00Z' },
          { id: 5, title: 'Poker Master', code: 'PM005', game_category: 'poker', game_status: true, created: '2024-01-19T16:00:00Z' },
        ]
      };
      
      setData(mockData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [searchTerm, currentPage]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchGames} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No games found" />;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Games</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all available games and their status
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by title, code, or category..."
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Games</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Games</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {data?.results?.filter(g => g.game_status).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Inactive Games</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {data?.results?.filter(g => !g.game_status).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {new Set(data?.results?.map(g => g.game_category)).size || 0}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Game Title</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results?.map((game) => (
              <TableRow key={game.id}>
                <TableCell>{game.id}</TableCell>
                <TableCell className="font-medium">{game.title}</TableCell>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{game.code}</code>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{game.game_category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={game.game_status ? 'success' : 'danger'}>
                    {game.game_status ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">
                  {formatDate(game.created)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(data.count / pageSize)}
          hasNext={!!data.next}
          hasPrevious={!!data.previous}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

