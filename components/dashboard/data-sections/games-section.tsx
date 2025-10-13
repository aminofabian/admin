'use client';

import { useEffect, useState } from 'react';
import { gamesApi } from '@/lib/api/games';
import type { Game, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, Pagination, SearchInput, Badge } from '@/components/ui';

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

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Game Title' },
    { key: 'code', label: 'Code' },
    { key: 'game_category', label: 'Category' },
    { key: 'game_status', label: 'Status' },
    { key: 'created', label: 'Created' },
  ];

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
          <h2 className="text-2xl font-bold text-foreground">Games</h2>
          <p className="text-sm text-muted-foreground mt-1">
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
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total Games</div>
          <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Active Games</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {data?.results?.filter(g => g.game_status).length || 0}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Inactive Games</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {data?.results?.filter(g => !g.game_status).length || 0}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Categories</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {new Set(data?.results?.map(g => g.game_category)).size || 0}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table columns={columns}>
          {data?.results?.map((game) => (
            <tr key={game.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-sm">{game.id}</td>
              <td className="px-4 py-3 text-sm font-medium">{game.title}</td>
              <td className="px-4 py-3 text-sm">
                <code className="bg-muted px-2 py-1 rounded text-xs">{game.code}</code>
              </td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="info">{game.game_category}</Badge>
              </td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={game.game_status ? 'success' : 'error'}>
                  {game.game_status ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(game.created)}
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {/* Pagination */}
      {data && data.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalItems={data.count}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

