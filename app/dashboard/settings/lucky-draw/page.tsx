'use client';

import { useEffect, useMemo, useState } from 'react';
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
import type {
  ActiveDrawCycle,
  CreateTicketEarningRuleRequest,
  DrawType,
  DrawTypeConfig,
  ManualDrawEligibility,
  TicketEarningRule,
} from '@/types/lucky-draw';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function CycleCard({
  title,
  cycle,
  eligibility,
  canRun,
  onRun,
  running,
}: {
  title: string;
  cycle: ActiveDrawCycle | null;
  eligibility: ManualDrawEligibility;
  canRun: boolean;
  onRun: () => void;
  running: boolean;
}) {
  if (!cycle) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-gray-50">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">No active cycle</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-50">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Scheduled {formatWhen(cycle.scheduled_at)}
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {cycle.ticket_type} tickets
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-500">Tickets</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-50">{cycle.ticket_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Players</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-50">
            {cycle.unique_player_count}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Winners</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-50">{cycle.winner_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Prize mode</dt>
          <dd className="font-semibold capitalize text-gray-900 dark:text-gray-50">
            {cycle.prize_distribution.replace('_', ' ')}
          </dd>
        </div>
      </dl>
      <div className="mt-4 space-y-2">
        <Button
          type="button"
          disabled={!canRun || !eligibility.allowed || running}
          onClick={onRun}
          className="w-full"
        >
          {running ? 'Running…' : 'Run Draw Now'}
        </Button>
        {!eligibility.allowed && (
          <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
            {eligibility.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        )}
        {eligibility.allowed && (
          <p className="text-xs text-gray-500">
            Thresholds met ({eligibility.min_tickets} tickets / {eligibility.min_players} players).
            Manual draw resets the cycle from now.
          </p>
        )}
      </div>
    </div>
  );
}

function ConfigEditor({
  label,
  drawType,
  value,
  disabled,
  onChange,
}: {
  label: string;
  drawType: DrawType;
  value: DrawTypeConfig;
  disabled: boolean;
  onChange: (next: DrawTypeConfig) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-50">{label}</h3>
        <Switch
          checked={value.enabled}
          disabled={disabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-gray-500">Winner count</span>
          <Input
            type="number"
            min={1}
            disabled={disabled}
            value={value.winner_count}
            onChange={(e) =>
              onChange({ ...value, winner_count: Number(e.target.value) || 1 })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-500">Equal prize amount</span>
          <Input
            disabled={disabled || value.prize_distribution !== 'equal'}
            value={value.prize_amount}
            onChange={(e) => onChange({ ...value, prize_amount: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-500">Prize distribution</span>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            disabled={disabled}
            value={value.prize_distribution}
            onChange={(e) =>
              onChange({
                ...value,
                prize_distribution: e.target.value as DrawTypeConfig['prize_distribution'],
              })
            }
          >
            <option value="equal">Equal</option>
            <option value="by_position">By position</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-500">Prize credit</span>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            disabled={disabled}
            value={value.prize_credit_mode}
            onChange={(e) =>
              onChange({
                ...value,
                prize_credit_mode: e.target.value as DrawTypeConfig['prize_credit_mode'],
              })
            }
          >
            <option value="auto">Auto credit</option>
            <option value="approval">Require approval</option>
          </select>
        </label>
      </div>
      {value.prize_distribution === 'by_position' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-500">Prize by winner position ({drawType})</p>
          {Array.from({ length: value.winner_count }, (_, i) => (
            <Input
              key={`${drawType}-pos-${i}`}
              disabled={disabled}
              value={value.prize_amounts_by_position[i] ?? ''}
              placeholder={`Position ${i + 1}`}
              onChange={(e) => {
                const next = [...value.prize_amounts_by_position];
                next[i] = e.target.value;
                onChange({ ...value, prize_amounts_by_position: next });
              }}
            />
          ))}
        </div>
      )}
      <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          disabled={disabled}
          checked={value.allow_multi_win}
          onChange={(e) => onChange({ ...value, allow_multi_win: e.target.checked })}
        />
        Allow one player to win multiple times in the same draw
      </label>
    </div>
  );
}

export default function LuckyDrawSettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();
  const {
    config,
    rules,
    active,
    isLoading,
    error,
    fetchAllCompany,
    saveConfig,
    createRule,
    patchRule,
    deleteRule,
    runManual,
  } = useLuckyDrawStore();

  const [weeklyDraft, setWeeklyDraft] = useState<DrawTypeConfig | null>(null);
  const [monthlyDraft, setMonthlyDraft] = useState<DrawTypeConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [newRule, setNewRule] = useState<CreateTicketEarningRuleRequest>({
    draw_type: 'weekly',
    ticket_type: 'silver',
    source: 'purchase_threshold',
    threshold_amount: '50.00',
    ticket_quantity: 1,
    is_enabled: true,
  });

  const canEdit = canEditLuckyDrawConfig(user?.role);
  const canOperate = canOperateLuckyDraw(user?.role);

  useEffect(() => {
    if (!user?.role) return;
    if (!canOperate) {
      router.push('/dashboard/settings');
    }
  }, [user?.role, canOperate, router]);

  useEffect(() => {
    if (canOperate) void fetchAllCompany();
  }, [canOperate, fetchAllCompany]);

  useEffect(() => {
    if (!config) return;
    setWeeklyDraft(config.weekly);
    setMonthlyDraft(config.monthly);
  }, [config]);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.id - b.id),
    [rules],
  );

  const handleSaveConfig = async () => {
    if (!weeklyDraft || !monthlyDraft) return;
    setSavingConfig(true);
    try {
      await saveConfig({ weekly: weeklyDraft, monthly: monthlyDraft });
      addToast({ type: 'success', title: 'Lucky draw config saved' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRun = async (cycle: ActiveDrawCycle) => {
    setRunningId(cycle.id);
    try {
      await runManual(cycle.id);
      addToast({
        type: 'success',
        title: 'Manual draw completed',
        description: `Next ${cycle.draw_type} draw scheduled from now (+${cycle.draw_type === 'weekly' ? '7' : '30'} days).`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Draw blocked',
        description: err instanceof Error ? err.message : 'Could not run draw',
      });
    } finally {
      setRunningId(null);
    }
  };

  const handleCreateRule = async () => {
    try {
      const payload: CreateTicketEarningRuleRequest = {
        ...newRule,
        ticket_type: newRule.draw_type === 'weekly' ? 'silver' : 'gold',
        threshold_amount:
          newRule.source === 'purchase_threshold' ? newRule.threshold_amount : null,
      };
      await createRule(payload);
      addToast({ type: 'success', title: 'Earning rule added' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not add rule',
        description: err instanceof Error ? err.message : 'Error',
      });
    }
  };

  const toggleRule = async (rule: TicketEarningRule) => {
    try {
      await patchRule(rule.id, { is_enabled: !rule.is_enabled });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Error',
      });
    }
  };

  if (isAuthLoading || isLoading) return <LoadingState />;
  if (!canOperate) return null;
  if (error && !config) {
    return <ErrorState message={error} onRetry={fetchAllCompany} />;
  }

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Lucky Draw
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Weekly (Silver) and Monthly (Gold) draws for this company. Manual draws are
            gated by Superadmin thresholds and reset the cycle from the draw time.
          </p>
        </div>
        <Link
          href="/dashboard/settings/lucky-draw/history"
          className="text-sm font-medium text-primary hover:underline"
        >
          View draw history →
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">Live cycles</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <CycleCard
            title="Weekly Draw"
            cycle={active?.weekly ?? null}
            eligibility={
              active?.eligibility.weekly ?? {
                allowed: false,
                early_manual_enabled: false,
                min_tickets: 0,
                min_players: 0,
                ticket_count: 0,
                unique_player_count: 0,
                reasons: ['Loading…'],
              }
            }
            canRun={canOperate}
            running={runningId === active?.weekly?.id}
            onRun={() => active?.weekly && void handleRun(active.weekly)}
          />
          <CycleCard
            title="Monthly Draw"
            cycle={active?.monthly ?? null}
            eligibility={
              active?.eligibility.monthly ?? {
                allowed: false,
                early_manual_enabled: false,
                min_tickets: 0,
                min_players: 0,
                ticket_count: 0,
                unique_player_count: 0,
                reasons: ['Loading…'],
              }
            }
            canRun={canOperate}
            running={runningId === active?.monthly?.id}
            onRun={() => active?.monthly && void handleRun(active.monthly)}
          />
        </div>
      </section>

      {canEdit && weeklyDraft && monthlyDraft && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
              Draw configuration
            </h2>
            <Button type="button" disabled={savingConfig} onClick={() => void handleSaveConfig()}>
              {savingConfig ? 'Saving…' : 'Save config'}
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ConfigEditor
              label="Weekly (Silver)"
              drawType="weekly"
              value={weeklyDraft}
              disabled={savingConfig}
              onChange={setWeeklyDraft}
            />
            <ConfigEditor
              label="Monthly (Gold)"
              drawType="monthly"
              value={monthlyDraft}
              disabled={savingConfig}
              onChange={setMonthlyDraft}
            />
          </div>
        </section>
      )}

      {!canEdit && (
        <p className="text-sm text-gray-500">
          Managers can operate live draws and view history. Company admins configure prizes
          and earning rules.
        </p>
      )}

      {canEdit && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
            Ticket earning rules
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Draw</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Ticket</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Source</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Threshold</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Qty</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Enabled</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                {sortedRules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-3 py-2 capitalize">{rule.draw_type}</td>
                    <td className="px-3 py-2 capitalize">{rule.ticket_type}</td>
                    <td className="px-3 py-2">{rule.source.replace('_', ' ')}</td>
                    <td className="px-3 py-2">{rule.threshold_amount ?? '—'}</td>
                    <td className="px-3 py-2">{rule.ticket_quantity}</td>
                    <td className="px-3 py-2">
                      <Switch
                        checked={rule.is_enabled}
                        onChange={() => void toggleRule(rule)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => void deleteRule(rule.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-50">Add rule</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={newRule.draw_type}
                onChange={(e) => {
                  const draw_type = e.target.value as DrawType;
                  setNewRule((prev) => ({
                    ...prev,
                    draw_type,
                    ticket_type: draw_type === 'weekly' ? 'silver' : 'gold',
                  }));
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={newRule.source}
                onChange={(e) =>
                  setNewRule((prev) => ({
                    ...prev,
                    source: e.target.value as CreateTicketEarningRuleRequest['source'],
                  }))
                }
              >
                <option value="purchase_threshold">Purchase threshold</option>
                <option value="spin">Eligible game spin</option>
              </select>
              <Input
                placeholder="Threshold $"
                disabled={newRule.source !== 'purchase_threshold'}
                value={newRule.threshold_amount ?? ''}
                onChange={(e) =>
                  setNewRule((prev) => ({ ...prev, threshold_amount: e.target.value }))
                }
              />
              <Input
                type="number"
                min={1}
                value={newRule.ticket_quantity}
                onChange={(e) =>
                  setNewRule((prev) => ({
                    ...prev,
                    ticket_quantity: Number(e.target.value) || 1,
                  }))
                }
              />
              <Button type="button" onClick={() => void handleCreateRule()}>
                Add rule
              </Button>
            </div>
          </div>
        </section>
      )}

      {user?.role === USER_ROLES.SUPERADMIN && (
        <p className="text-sm text-gray-500">
          Superadmin global manual-draw gates live under{' '}
          <Link href="/dashboard/settings/lucky-draw-thresholds" className="text-primary underline">
            Lucky Draw Thresholds
          </Link>
          .
        </p>
      )}
    </div>
  );
}
