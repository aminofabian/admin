'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { canEditLuckyDrawManualThresholds } from '@/lib/constants/roles';
import { useLuckyDrawStore } from '@/stores';
import { Button, Switch, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/features';
import type { ManualDrawThresholds } from '@/types/lucky-draw';

export default function LuckyDrawThresholdsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();
  const { thresholds, isLoading, error, fetchThresholds, saveThresholds } = useLuckyDrawStore();
  const [draft, setDraft] = useState<ManualDrawThresholds | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = canEditLuckyDrawManualThresholds(user?.role);

  useEffect(() => {
    if (!user?.role) return;
    if (!canEdit) router.push('/dashboard/settings');
  }, [user?.role, canEdit, router]);

  useEffect(() => {
    if (canEdit) void fetchThresholds();
  }, [canEdit, fetchThresholds]);

  useEffect(() => {
    if (thresholds) setDraft(thresholds);
  }, [thresholds]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveThresholds(draft);
      addToast({ type: 'success', title: 'Manual draw thresholds saved' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isAuthLoading || isLoading) return <LoadingState />;
  if (!canEdit) return null;
  if (error && !draft) {
    return <ErrorState message={error} onRetry={fetchThresholds} />;
  }
  if (!draft) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          Lucky Draw — Manual thresholds
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Global Superadmin gates for early/manual draws. Company admins configure prizes
          and earning rules separately. Scheduled automatic draws do not use these
          thresholds.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-gray-900 dark:text-gray-50">
              Allow early / manual draws
            </h2>
            <p className="text-sm text-gray-500">
              When off, company “Run Draw Now” stays blocked everywhere.
            </p>
          </div>
          <Switch
            checked={draft.early_manual_enabled}
            onChange={(early_manual_enabled) =>
              setDraft((prev) => (prev ? { ...prev, early_manual_enabled } : prev))
            }
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-gray-50">Weekly</h3>
          <label className="mt-3 block text-sm">
            <span className="text-gray-500">Minimum tickets</span>
            <Input
              type="number"
              min={0}
              value={draft.weekly_min_tickets}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, weekly_min_tickets: Number(e.target.value) || 0 }
                    : prev,
                )
              }
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="text-gray-500">Minimum unique players</span>
            <Input
              type="number"
              min={0}
              value={draft.weekly_min_players}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, weekly_min_players: Number(e.target.value) || 0 }
                    : prev,
                )
              }
            />
          </label>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-gray-50">Monthly</h3>
          <label className="mt-3 block text-sm">
            <span className="text-gray-500">Minimum tickets</span>
            <Input
              type="number"
              min={0}
              value={draft.monthly_min_tickets}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, monthly_min_tickets: Number(e.target.value) || 0 }
                    : prev,
                )
              }
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="text-gray-500">Minimum unique players</span>
            <Input
              type="number"
              min={0}
              value={draft.monthly_min_players}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, monthly_min_players: Number(e.target.value) || 0 }
                    : prev,
                )
              }
            />
          </label>
        </div>
      </section>

      <Button type="button" disabled={saving} onClick={() => void handleSave()}>
        {saving ? 'Saving…' : 'Save thresholds'}
      </Button>
    </div>
  );
}
