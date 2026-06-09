'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import { LoadingState, ErrorState } from '@/components/features';
import { PlayerTimelineSection } from '@/components/dashboard/players/player-timeline-section';
import type { Player } from '@/types';

export default function PlayerTimelinePage() {
  const params = useParams();
  const playerId = params?.id ? parseInt(params.id as string, 10) : null;

  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId || Number.isNaN(playerId)) {
      setError('Invalid player id');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadPlayer = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<Player>(API_ENDPOINTS.PLAYERS.DETAIL(playerId));
        if (!cancelled) {
          setPlayer(data);
          document.title = `${data.username} - Timeline`;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load player');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPlayer();

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (!playerId || Number.isNaN(playerId)) {
    return <ErrorState message="Invalid player id" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6">
          <ErrorState message={error ?? 'Player not found'} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6">
        <PlayerTimelineSection playerId={playerId} username={player.username} />
      </div>
    </div>
  );
}
