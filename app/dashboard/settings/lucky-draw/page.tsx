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
    return `${winners} winners split $${total || '0.00'}`;
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
      <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-gray-50">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">Disabled — enable in configuration below.</p>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-gray-50">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">No active cycle</p>
      </div>
    );
  }

  const ticketPct = manual
    ? Math.min(100, Math.round((manual.ticket_count / Math.max(1, manual.min_tickets)) * 100))
    : 0;
  const playerPct = manual
    ? Math.min(100, Math.round((manual.player_count / Math.max(1, manual.min_players)) * 100))
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-50">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Scheduled {formatWhen(cycle.scheduled_draw_at)}
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {cycle.status}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-500">Tickets</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-50">{cycle.ticket_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Players</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-50">{cycle.player_count}</dd>
        </div>
      </dl>
      {prize ? <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{prize}</p> : null}

      {manual && showRunButton && (
        <div className="mt-4 space-y-2">
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
            variant={manual.eligible ? 'primary' : 'secondary'}
            disabled={!canRun || !manual.eligible || running}
            onClick={onRun}
            className="w-full"
            title={
              !manual.eligible
                ? manual.block_reasons.map((reason) => reasonLine(reason, manual)).join(' ')
                : 'Run draw now and start a new cycle'
            }
          >
            {running ? 'Running…' : 'Run Draw Now'}
          </Button>
          {!manual.eligible && (
            <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
              {manual.block_reasons.map((reason) => (
                <li key={reason}>• {reasonLine(reason, manual)}</li>
              ))}
            </ul>
          )}
          {manual.eligible && (
            <p className="text-xs text-gray-500">
              Thresholds met. Manual draw resets the schedule from now.
            </p>
          )}
        </div>
      )}

      {!showRunButton && (
        <p className="mt-4 text-xs text-gray-500">
          Early/manual draws are disabled globally. Scheduled countdown still applies.
        </p>
      )}
    </div>
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
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium capitalize text-gray-900 dark:text-gray-50">
            {drawType} ({drawType === 'weekly' ? 'Silver' : 'Gold'})
          </h3>
          <Switch
            checked={draft[enabledKey] as boolean}
            disabled={disabled}
            onChange={(v) => update({ [enabledKey]: v })}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-gray-500">Winner count</span>
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
          <label className="block text-sm">
            <span className="text-gray-500">Prize mode</span>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              disabled={disabled}
              value={mode}
              onChange={(e) => update({ [modeKey]: e.target.value as PrizeMode })}
            >
              <option value="equal">Equal (split total)</option>
              <option value="individual">Individual amounts</option>
            </select>
          </label>
          {mode === 'equal' ? (
            <label className="block text-sm sm:col-span-2">
              <span className="text-gray-500">Prize total (split across winners)</span>
              <Input
                disabled={disabled}
                value={draft[totalKey] as string}
                onChange={(e) => update({ [totalKey]: e.target.value })}
              />
            </label>
          ) : (
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs text-gray-500">
                Amount per winner position ({winnerCount} required)
              </p>
              {Array.from({ length: winnerCount }, (_, i) => (
                <label key={`${drawType}-amt-${i}`} className="block text-sm">
                  <span className="text-gray-500">{placeLabel(i)} place</span>
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
            <span className="text-gray-500">Purchase threshold ($)</span>
            <Input
              disabled={disabled}
              value={draft[thresholdKey] as string}
              onChange={(e) => update({ [thresholdKey]: e.target.value })}
              placeholder="0 = disabled"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-500">Tickets per threshold</span>
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
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {renderPrizeSection('weekly')}
        {renderPrizeSection('monthly')}
      </div>
      <div className="flex flex-wrap gap-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            disabled={disabled}
            checked={draft.allow_multiple_wins_same_player}
            onChange={(e) =>
              update({ allow_multiple_wins_same_player: e.target.checked })
            }
          />
          Allow same player to win multiple times in one draw
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            disabled={disabled}
            checked={draft.prize_auto_credit}
            onChange={(e) => update({ prize_auto_credit: e.target.checked })}
          />
          Auto-credit prizes (off = require admin approval)
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Spin tickets are configured on Roulette reward configs (
        <code>weekly_ticket</code> / <code>monthly_ticket</code>).
      </p>
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
    <div className="space-y-10 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Lucky Draw
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Weekly (Silver) and Monthly (Gold) draws. Manual draws are gated by Superadmin
            thresholds and reset the cycle from the draw time.
          </p>
        </div>
        <Link
          href="/dashboard/settings/lucky-draw/history"
          className="text-sm font-medium text-primary hover:underline"
        >
          View draw history →
        </Link>
      </header>

      {isSuperadmin && (
        <LuckyDrawCompanyPicker value={companyId} onChange={setCompanyId} />
      )}

      {needsCompany && (
        <p className="text-sm text-gray-500">Select a company to load its lucky draw.</p>
      )}

      {!needsCompany && isLoading && !status && <LoadingState />}

      {!needsCompany && error && !status && (
        <ErrorState message={error} onRetry={fetchStatus} />
      )}

      {!needsCompany && status && (
      <>
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">Live status</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <CycleCard
            title="Weekly Draw"
            enabled={status?.settings.weekly_enabled ?? true}
            status={status?.weekly}
            prize={status?.settings ? prizeLine(status.settings, 'weekly') : undefined}
            canRun={canOperate}
            showRunButton={earlyEnabled}
            running={runningType === 'weekly'}
            onRun={() => void handleRun('weekly')}
          />
          <CycleCard
            title="Monthly Draw"
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
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
              Draw configuration
            </h2>
            <Button type="button" disabled={savingConfig} onClick={() => void handleSaveConfig()}>
              {savingConfig ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
          <SettingsEditor draft={draft} disabled={savingConfig} onChange={setDraft} />
        </section>
      )}

      {!canEdit && (
        <p className="text-sm text-gray-500">
          You can view live draws and history. Prize and threshold settings are limited to
          company admins and managers.
        </p>
      )}

      {user?.role === USER_ROLES.SUPERADMIN && (
        <p className="text-sm text-gray-500">
          Superadmin global early-draw gates live under{' '}
          <Link href="/dashboard/settings/lucky-draw-thresholds" className="text-primary underline">
            Lucky Draw Thresholds
          </Link>
          .
        </p>
      )}
      </>
      )}
    </div>
  );
}
