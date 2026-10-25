'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canOperateLuckyDraw } from '@/lib/constants/roles';
import { useLuckyDrawStore } from '@/stores';
import { LoadingState, ErrorState } from '@/components/features';

export default function LuckyDrawHistoryPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { history, isLoading, error, fetchHistory } = useLuckyDrawStore();
  const canOperate = canOperateLuckyDraw(user?.role);

  useEffect(() => {
    if (!user?.role) return;
    if (!canOperate) router.push('/dashboard/settings');
  }, [user?.role, canOperate, router]);

  useEffect(() => {
    if (canOperate) void fetchHistory();
  }, [canOperate, fetchHistory]);

  if (isAuthLoading || isLoading) return <LoadingState />;
  if (!canOperate) return null;
  if (error && history.length === 0) {
    return <ErrorState message={error} onRetry={fetchHistory} />;
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Draw history
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Completed cycles with winners, prizes, and draw method.
          </p>
        </div>
        <Link
          href="/dashboard/settings/lucky-draw"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to Lucky Draw
        </Link>
      </header>

      <div className="space-y-4">
        {history.length === 0 && (
          <p className="text-sm text-gray-500">No completed draws yet.</p>
        )}
        {history.map((entry) => (
          <article
            key={entry.id}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium capitalize text-gray-900 dark:text-gray-50">
                {entry.draw_type} draw #{entry.id}
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 capitalize dark:bg-gray-900">
                  {entry.method}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {entry.status}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Completed {new Date(entry.completed_at).toLocaleString()} ·{' '}
              {entry.ticket_count} tickets · {entry.unique_player_count} players
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">Pos</th>
                  <th className="py-1">Player</th>
                  <th className="py-1">Ticket</th>
                  <th className="py-1">Prize</th>
                  <th className="py-1">Credited</th>
                </tr>
              </thead>
              <tbody>
                {entry.winners.map((w) => (
                  <tr key={`${entry.id}-${w.position}`} className="border-t border-gray-100 dark:border-gray-900">
                    <td className="py-1.5">{w.position}</td>
                    <td className="py-1.5">{w.player_username}</td>
                    <td className="py-1.5">{w.ticket_id}</td>
                    <td className="py-1.5">${w.prize_amount}</td>
                    <td className="py-1.5">{w.credited ? 'Yes' : 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
    </div>
  );
}
