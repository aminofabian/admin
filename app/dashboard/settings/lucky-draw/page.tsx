'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import {
  USER_ROLES,
  canEditLuckyDrawConfig,
  canOperateLuckyDraw,
} from '@/lib/constants/roles';
import { useLuckyDrawStore } from '@/stores';
import { Button, Switch, useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/features';
import { LuckyDrawCompanyPicker } from '@/components/dashboard/settings/lucky-draw-company-picker';
import { luckyDrawErrorMessage } from '@/lib/lucky-draw/normalize';
import type {
  DrawType,
  DrawTypeStatus,
  LuckyDrawCompanySettings,
  PrizeMode,
} from '@/types/lucky-draw';
import { MANUAL_DRAW_BLOCK_COPY } from '@/types/lucky-draw';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function blockReasonCopy(code: string) {
  return MANUAL_DRAW_BLOCK_COPY[code] ?? code;
}

function reasonLine(
  code: string,
  manual: { ticket_count: number; player_count: number; min_tickets: number; min_players: number },
) {
  if (code === 'min_tickets_not_met') {
    return `Need at least ${manual.min_tickets} tickets (have ${manual.ticket_count}).`;
  }
  if (code === 'min_players_not_met') {
    return `Need at least ${manual.min_players} unique players (have ${manual.player_count}).`;
  }
  return blockReasonCopy(code);
}

function placeLabel(index: number) {
  const n = index + 1;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function prizeLine(settings: LuckyDrawCompanySettings, drawType: DrawType) {
  const winners =
    drawType === 'weekly' ? settings.weekly_winner_count : settings.monthly_winner_count;
  const mode = drawType === 'weekly' ? settings.weekly_prize_mode : settings.monthly_prize_mode;
  if (mode === 'equal') {
    const total =
      drawType === 'weekly' ? settings.weekly_prize_total : settings.monthly_prize_total;
    return `$${total || '0'} · ${winners}`;
  }
  const amounts =
    drawType === 'weekly' ? settings.weekly_prize_amounts : settings.monthly_prize_amounts;
  return amounts
    .slice(0, winners)
    .map((amount, index) => `${placeLabel(index)} $${amount || '0.00'}`)
    .join(' · ');
}

function CycleCard({
  title,
  enabled,
  status,
  prize,
  canRun,
  showRunButton,
  onRun,
  running,
}: {
  title: string;
  enabled: boolean;
  status: DrawTypeStatus | undefined;
  prize?: string;
  canRun: boolean;
  showRunButton: boolean;
  onRun: () => void;
  running: boolean;
}) {
  const cycle = status?.cycle ?? null;
  const manual = status?.manual_draw;

  if (!enabled) {
    return (
      <section className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500">Off</p>
      </section>
    );
  }

  if (!cycle) {
    return (
      <section className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500">No active draw</p>
      </section>
    );
  }

  const ticketPct = manual
    ? Math.min(100, Math.round((manual.ticket_count / Math.max(1, manual.min_tickets)) * 100))
    : 0;
  const playerPct = manual
    ? Math.min(100, Math.round((manual.player_count / Math.max(1, manual.min_players)) * 100))
    : 0;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{formatWhen(cycle.scheduled_draw_at)}</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium capitalize text-emerald-700 dark:text-emerald-300">
          {cycle.status}
        </span>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700/80">
        <div className="px-5 py-4">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Tickets</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
            {cycle.ticket_count}
          </dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Players</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">
            {cycle.player_count}
          </dd>
        </div>
      </dl>
      {prize ? (
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-700/80">
          {prize}
        </p>
      ) : null}

      {manual && showRunButton && (
        <div className="space-y-3 border-t border-gray-100 px-5 py-4 dark:border-gray-700/80">
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>
                Tickets {manual.ticket_count}/{manual.min_tickets}
              </span>
              <span>{ticketPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${ticketPct}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span>
                Players {manual.player_count}/{manual.min_players}
              </span>
              <span>{playerPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${playerPct}%` }}
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant={manual.eligible ? 'primary' : 'secondary'}
            disabled={!canRun || !manual.eligible || running}
            onClick={onRun}
            title={
              !manual.eligible
                ? manual.block_reasons.map((reason) => reasonLine(reason, manual)).join(' ')
                : undefined
            }
          >
            {running ? 'Running…' : 'Run now'}
          </Button>
          {!manual.eligible && (
            <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
              {manual.block_reasons.map((reason) => (
                <li key={reason}>{reasonLine(reason, manual)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function SettingsEditor({
  draft,
  disabled,
  onChange,
}: {
  draft: LuckyDrawCompanySettings;
  disabled: boolean;
  onChange: (next: LuckyDrawCompanySettings) => void;
}) {
  const update = (patch: Partial<LuckyDrawCompanySettings>) =>
    onChange({ ...draft, ...patch });

  const renderPrizeSection = (drawType: DrawType) => {
    const enabledKey = drawType === 'weekly' ? 'weekly_enabled' : 'monthly_enabled';
    const winnerKey = drawType === 'weekly' ? 'weekly_winner_count' : 'monthly_winner_count';
    const modeKey = drawType === 'weekly' ? 'weekly_prize_mode' : 'monthly_prize_mode';
    const totalKey = drawType === 'weekly' ? 'weekly_prize_total' : 'monthly_prize_total';
    const amountsKey =
      drawType === 'weekly' ? 'weekly_prize_amounts' : 'monthly_prize_amounts';
    const thresholdKey =
      drawType === 'weekly' ? 'weekly_purchase_threshold' : 'monthly_purchase_threshold';
    const ticketsKey =
      drawType === 'weekly'
        ? 'weekly_tickets_per_threshold'
        : 'monthly_tickets_per_threshold';

    const mode = draft[modeKey] as PrizeMode;
    const winnerCount = draft[winnerKey] as number;
    const amounts = draft[amountsKey] as string[];

    return (
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700/80">
          <div>
            <h3 className="text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">
              {drawType}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {drawType === 'weekly' ? 'Silver' : 'Gold'}
            </p>
          </div>
          <Switch
            checked={draft[enabledKey] as boolean}
            disabled={disabled}
            onChange={(v) => update({ [enabledKey]: v })}
            tone="emerald"
          />
        </div>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs text-gray-500">Winners</span>
            <Input
              type="number"
              min={1}
              disabled={disabled}
              value={winnerCount}
              onChange={(e) => {
                const n = Math.max(1, Number(e.target.value) || 1);
                const nextAmounts = [...amounts];
                while (nextAmounts.length < n) nextAmounts.push('');
                update({
                  [winnerKey]: n,
                  [amountsKey]: nextAmounts.slice(0, n),
                });
              }}
            />
          </label>
          <div className="block text-sm">
            <span className="text-xs text-gray-500">Prize split</span>
            <div className="mt-1 inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-600">
              {(['equal', 'individual'] as const).map((option) => {
                const selected = mode === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() => update({ [modeKey]: option })}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      selected
                        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {option === 'equal' ? 'Equal' : 'Custom'}
                  </button>
                );
              })}
            </div>
          </div>
          {mode === 'equal' ? (
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs text-gray-500">Prize</span>
              <Input
                disabled={disabled}
                value={draft[totalKey] as string}
                onChange={(e) => update({ [totalKey]: e.target.value })}
              />
            </label>
          ) : (
            <div className="space-y-2 sm:col-span-2">
              {Array.from({ length: winnerCount }, (_, i) => (
                <label key={`${drawType}-amt-${i}`} className="block text-sm">
                  <span className="text-xs text-gray-500">{placeLabel(i)}</span>
                  <Input
                    disabled={disabled}
                    value={amounts[i] ?? ''}
                    aria-label={`${placeLabel(i)} place prize`}
                    onChange={(e) => {
                      const next = [...amounts];
                      next[i] = e.target.value;
                      update({ [amountsKey]: next });
                    }}
                  />
                </label>
              ))}
            </div>
          )}
          <label className="block text-sm">
            <span className="text-xs text-gray-500">Spend</span>
            <Input
              disabled={disabled}
              value={draft[thresholdKey] as string}
              onChange={(e) => update({ [thresholdKey]: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-gray-500">Tickets</span>
            <Input
              type="number"
              min={0}
              disabled={disabled}
              value={draft[ticketsKey] as number}
              onChange={(e) =>
                update({ [ticketsKey]: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {renderPrizeSection('weekly')}
        {renderPrizeSection('monthly')}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            disabled={disabled}
            checked={draft.allow_multiple_wins_same_player}
            onChange={(e) =>
              update({ allow_multiple_wins_same_player: e.target.checked })
            }
          />
          Repeat wins
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            disabled={disabled}
            checked={draft.prize_auto_credit}
            onChange={(e) => update({ prize_auto_credit: e.target.checked })}
          />
          Auto-credit
        </label>
      </div>
    </div>
  );
}

const STATUS_POLL_MS = 45_000;

export default function LuckyDrawSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();
  const {
    settings,
    status,
    isLoading,
    error,
    companyId,
    setCompanyId,
    fetchStatus,
    saveSettings,
    runDraw,
  } = useLuckyDrawStore();

  const [draft, setDraft] = useState<LuckyDrawCompanySettings | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [runningType, setRunningType] = useState<DrawType | null>(null);

  const canEdit = canEditLuckyDrawConfig(user?.role);
  const canOperate = canOperateLuckyDraw(user?.role);
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const needsCompany = isSuperadmin && companyId == null;

  useEffect(() => {
    if (!user?.role) return;
    if (!canOperate) {
      router.push('/dashboard/settings');
    }
  }, [user?.role, canOperate, router]);

  useEffect(() => {
    if (!canOperate || needsCompany) return;
    void fetchStatus();
    const timer = setInterval(() => void fetchStatus(), STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [canOperate, needsCompany, fetchStatus]);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const handleSaveConfig = async () => {
    if (!draft) return;
    if (
      draft.weekly_prize_mode === 'individual' &&
      draft.weekly_prize_amounts.length !== draft.weekly_winner_count
    ) {
      addToast({
        type: 'error',
        title: 'Invalid prize amounts',
        description: 'Weekly individual amounts must match winner count',
      });
      return;
    }
    if (
      draft.monthly_prize_mode === 'individual' &&
      draft.monthly_prize_amounts.length !== draft.monthly_winner_count
    ) {
      addToast({
        type: 'error',
        title: 'Invalid prize amounts',
        description: 'Monthly individual amounts must match winner count',
      });
      return;
    }
    setSavingConfig(true);
    try {
      await saveSettings(draft);
      addToast({ type: 'success', title: 'Lucky draw settings saved' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save failed',
        description: luckyDrawErrorMessage(err, 'Could not save'),
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRun = async (drawType: DrawType) => {
    setRunningType(drawType);
    try {
      await runDraw(drawType);
      addToast({
        type: 'success',
        title: 'Manual draw completed',
        description: `Next ${drawType} cycle scheduled from now (+${drawType === 'weekly' ? '7' : '30'} days).`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Draw blocked',
        description: luckyDrawErrorMessage(err, 'Could not run draw'),
      });
      void fetchStatus();
    } finally {
      setRunningType(null);
    }
  };

  if (isAuthLoading) return <LoadingState />;
  if (!canOperate) return null;

  const earlyEnabled = status?.global.early_draw_enabled !== false;

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Lucky Draw</h1>
        <div className="flex items-center gap-4 text-sm font-medium">
          {isSuperadmin && (
            <Link
              href="/dashboard/settings/lucky-draw-thresholds"
              className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Thresholds
            </Link>
          )}
          <Link href="/dashboard/settings/lucky-draw/history" className="text-primary">
            History
          </Link>
        </div>
      </header>

      {isSuperadmin && (
        <LuckyDrawCompanyPicker value={companyId} onChange={setCompanyId} />
      )}

      {needsCompany && (
        <p className="text-sm text-gray-500">Select a company.</p>
      )}

      {!needsCompany && isLoading && !status && <LoadingState />}

      {!needsCompany && error && !status && (
        <ErrorState message={error} onRetry={fetchStatus} />
      )}

      {!needsCompany && status && (
      <>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Live</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <CycleCard
            title="Weekly"
            enabled={status?.settings.weekly_enabled ?? true}
            status={status?.weekly}
            prize={status?.settings ? prizeLine(status.settings, 'weekly') : undefined}
            canRun={canOperate}
            showRunButton={earlyEnabled}
            running={runningType === 'weekly'}
            onRun={() => void handleRun('weekly')}
          />
          <CycleCard
            title="Monthly"
            enabled={status?.settings.monthly_enabled ?? true}
            status={status?.monthly}
            prize={status?.settings ? prizeLine(status.settings, 'monthly') : undefined}
            canRun={canOperate}
            showRunButton={earlyEnabled}
            running={runningType === 'monthly'}
            onRun={() => void handleRun('monthly')}
          />
        </div>
      </section>

      {canEdit && draft && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Settings</h2>
            <Button type="button" size="sm" disabled={savingConfig} onClick={() => void handleSaveConfig()}>
              {savingConfig ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <SettingsEditor draft={draft} disabled={savingConfig} onChange={setDraft} />
        </section>
      )}

      </>
      )}
    </div>
  );
}
