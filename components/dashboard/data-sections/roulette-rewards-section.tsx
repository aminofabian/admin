'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { EmptyState } from '@/components/features';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  rouletteRewardsApi,
  type RouletteReward,
} from '@/lib/api/roulette-rewards';

const PAGE_SIZE = 20;

export function RouletteRewardsSection() {
  const [rewards, setRewards] = useState<RouletteReward[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rouletteRewardsApi.list({
        page,
        page_size: PAGE_SIZE,
      });
      setRewards(data.results);
      setTotalCount(data.count);
    } catch (e) {
      setRewards([]);
      setError(e instanceof Error ? e.message : 'Failed to load roulette rewards');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const showUserColumn = rewards.some((r) => r.user_username);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Prize Wheel Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spin history from the prize wheel. Results are scoped to your role.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-3 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading rewards…
          </div>
        ) : rewards.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No prize wheel rewards"
              description="Rewards will appear here after players spin the wheel"
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {showUserColumn && <TableHead>Player</TableHead>}
                  <TableHead>Prize</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    {showUserColumn && (
                      <TableCell className="font-medium">
                        {reward.user_username ?? `User #${reward.user_id ?? '—'}`}
                      </TableCell>
                    )}
                    <TableCell>{reward.prize}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        {reward.prize_type}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {parseFloat(reward.amount) > 0
                        ? `$${parseFloat(reward.amount).toFixed(2)}`
                        : reward.quantity > 1
                          ? `×${reward.quantity}`
                          : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">{reward.position}</TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {reward.created_at
                        ? format(new Date(reward.created_at), 'MMM d, yyyy h:mm a')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalCount > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  hasNext={page < totalPages}
                  hasPrevious={page > 1}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
