'use client';

import { useEffect, useState } from 'react';
import { playersApi } from '@/lib/api/users';
import type { Player, PaginatedResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { Table, Pagination, SearchInput, Badge } from '@/components/ui';

export function PlayersSection() {
  const [data, setData] = useState<PaginatedResponse<Player> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData: PaginatedResponse<Player> = {
        count: 150,
        next: null,
        previous: null,
        results: [
          { id: 1, username: 'player1', email: 'player1@example.com', full_name: 'John Doe', role: 'player', balance: '1250.50', winning_balance: '320.75', is_active: true, project_id: 1, created: '2024-01-15T10:30:00Z', modified: '2024-01-15T10:30:00Z' },
          { id: 2, username: 'player2', email: 'player2@example.com', full_name: 'Jane Smith', role: 'player', balance: '890.25', winning_balance: '150.00', is_active: true, project_id: 1, created: '2024-01-16T11:45:00Z', modified: '2024-01-16T11:45:00Z' },
          { id: 3, username: 'player3', email: 'player3@example.com', full_name: 'Bob Johnson', role: 'player', balance: '2500.00', winning_balance: '890.50', is_active: true, project_id: 1, created: '2024-01-17T09:20:00Z', modified: '2024-01-17T09:20:00Z' },
          { id: 4, username: 'player4', email: 'player4@example.com', full_name: 'Alice Brown', role: 'player', balance: '450.75', winning_balance: '0.00', is_active: false, project_id: 1, created: '2024-01-18T14:30:00Z', modified: '2024-01-18T14:30:00Z' },
          { id: 5, username: 'player5', email: 'player5@example.com', full_name: 'Charlie Davis', role: 'player', balance: '3200.00', winning_balance: '1250.25', is_active: true, project_id: 1, created: '2024-01-19T16:00:00Z', modified: '2024-01-19T16:00:00Z' },
        ]
      };
      
      setData(mockData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [searchTerm, currentPage]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchPlayers} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No players found" />;
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'username', label: 'Username' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'balance', label: 'Balance' },
    { key: 'winning_balance', label: 'Winning Balance' },
    { key: 'is_active', label: 'Status' },
    { key: 'created', label: 'Joined' },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(String(amount)).toFixed(2)}`;
  };

  const totalBalance = data?.results?.reduce((sum, player) => sum + parseFloat(player.balance || '0'), 0) || 0;
  const totalWinnings = data?.results?.reduce((sum, player) => sum + parseFloat(player.winning_balance || '0'), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Players</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all player accounts and balances
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by username, email, or full name..."
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total Players</div>
          <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Active Players</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {data?.results?.filter(p => p.is_active).length || 0}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total Balance</div>
          <div className="text-2xl font-bold text-blue-500 mt-1">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total Winnings</div>
          <div className="text-2xl font-bold text-green-500 mt-1">{formatCurrency(totalWinnings)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table columns={columns}>
          {data?.results?.map((player) => (
            <tr key={player.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-sm">{player.id}</td>
              <td className="px-4 py-3 text-sm font-medium">{player.username}</td>
              <td className="px-4 py-3 text-sm">{player.full_name || '-'}</td>
              <td className="px-4 py-3 text-sm">{player.email}</td>
              <td className="px-4 py-3 text-sm font-semibold text-blue-500">
                {formatCurrency(player.balance || 0)}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-green-500">
                {formatCurrency(player.winning_balance || 0)}
              </td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={player.is_active ? 'success' : 'error'}>
                  {player.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(player.created)}
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

