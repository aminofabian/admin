'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES, canOperateLuckyDraw } from '@/lib/constants/roles';
import { useLuckyDrawStore } from '@/stores';
import { Button, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';
import { LuckyDrawCompanyPicker } from '@/components/dashboard/settings/lucky-draw-company-picker';
import { luckyDrawErrorMessage } from '@/lib/lucky-draw/normalize';
import type { DrawHistoryEntry, DrawType } from '@/types/lucky-draw';

export default function LuckyDrawHistoryPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();
  const {
    history,
    historyDetail,
    isLoading,
    error,
    companyId,
    setCompanyId,
    fetchHistory,
    fetchHistoryDetail,
    creditWinner,
  } = useLuckyDrawStore();
  const [drawType, setDrawType] = useState<DrawType | ''>('');
  const [creditingId, setCreditingId] = useState<number | null>(null);
  const canOperate = canOperateLuckyDraw(user?.role);
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const needsCompany = isSuperadmin && companyId == null;

  useEffect(() => {
    if (!user?.role) return;
    if (!canOperate) router.push('/dashboard/settings');
  }, [user?.role, canOperate, router]);

  useEffect(() => {
    if (!canOperate || needsCompany) return;
    void fetchHistory({
      drawType: drawType || undefined,
      limit: 20,
    });
  }, [canOperate, needsCompany, fetchHistory, drawType]);

  const openDetail = (entry: DrawHistoryEntry) => {
    void fetchHistoryDetail(entry.id);
  };

  const handleCredit = async (winnerId: number) => {
    setCreditingId(winnerId);
    try {
      await creditWinner(winnerId);
      addToast({ type: 'success', title: 'Prize credited' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Credit failed',
        description: luckyDrawErrorMessage(err, 'Could not credit prize'),
      });
    } finally {
      setCreditingId(null);
    }
  };

  if (isAuthLoading) return <LoadingState />;
  if (!canOperate) return null;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Draw history
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Completed cycles with winners, prizes, and draw method.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            value={drawType}
            onChange={(e) => setDrawType(e.target.value as DrawType | '')}
          >
            <option value="">All types</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <Link
            href="/dashboard/settings/lucky-draw"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to Lucky Draw
          </Link>
        </div>
      </header>

      {isSuperadmin && (
        <LuckyDrawCompanyPicker value={companyId} onChange={setCompanyId} />
      )}

      {needsCompany && (
        <p className="text-sm text-gray-500">Select a company to view its draw history.</p>
      )}

      {!needsCompany && isLoading && history.length === 0 && <LoadingState />}

      {!needsCompany && error && history.length === 0 && (
        <ErrorState
          message={error}
          onRetry={() => fetchHistory({ drawType: drawType || undefined, limit: 20 })}
        />
      )}

      {!needsCompany && (history.length > 0 || (!isLoading && !error)) && (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Method</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Tickets</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Players</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Winners</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Prizes</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
            {history.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  No completed draws yet.
                </td>
              </tr>
            )}
            {history.map((entry) => (
              <tr key={entry.id}>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(entry.completed_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 capitalize">{entry.draw_type}</td>
                <td className="px-3 py-2 capitalize">{entry.draw_method}</td>
                <td className="px-3 py-2">{entry.ticket_count}</td>
                <td className="px-3 py-2">{entry.player_count}</td>
                <td className="px-3 py-2">{entry.winners?.length ?? 0}</td>
                <td className="px-3 py-2 capitalize">{entry.prize_status ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => openDetail(entry)}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {historyDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl dark:bg-gray-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold capitalize text-gray-900 dark:text-gray-50">
                  {historyDetail.draw_type} draw #{historyDetail.id}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {historyDetail.draw_method} ·{' '}
                  {new Date(historyDetail.completed_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-gray-500 hover:underline"
                onClick={() => useLuckyDrawStore.setState({ historyDetail: null })}
              >
                Close
              </button>
            </div>

            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">Pos</th>
                  <th className="py-1">Player</th>
                  <th className="py-1">Prize</th>
                  <th className="py-1">Status</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {(historyDetail.winners ?? []).map((w) => (
                  <tr
                    key={w.id}
                    className="border-t border-gray-100 dark:border-gray-900"
                  >
                    <td className="py-2">{w.position}</td>
                    <td className="py-2">{w.player_username}</td>
                    <td className="py-2">${w.prize_amount}</td>
                    <td className="py-2 capitalize">{w.prize_status}</td>
                    <td className="py-2 text-right">
                      {w.prize_status === 'pending' && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={creditingId === w.id}
                          onClick={() => void handleCredit(w.id)}
                        >
                          {creditingId === w.id ? '…' : 'Credit'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
