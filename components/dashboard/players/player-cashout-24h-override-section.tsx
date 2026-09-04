'use client';

import { useCallback, useEffect, useState } from 'react';
import { playersApi } from '@/lib/api';
import {
  cashout24hLimitApi,
  type Cashout24hLimitSnapshot,
} from '@/lib/api/cashout-24h-limit';
import { Button, Input, Switch, useToast } from '@/components/ui';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';
import { formatCurrency } from '@/lib/utils/formatters';
import type { Player } from '@/types';

export interface PlayerCashout24hOverrideSectionProps {
  player: Player;
  canEdit: boolean;
  onPlayerUpdated?: (player: Player) => void;
}

function formatEffective(amount: string | null | undefined): string {
  if (amount === null || amount === undefined) return 'Unlimited';
  return formatCurrency(amount);
}

function sourceLabel(source: string | undefined): string {
  if (source === 'player_override') return 'Player override';
  if (source === 'company_default') return 'Company default';
  if (source === 'unlimited') return 'Unlimited';
  return source ? source.replace(/_/g, ' ') : '—';
}

export function PlayerCashout24hOverrideSection({
  player,
  canEdit,
  onPlayerUpdated,
}: PlayerCashout24hOverrideSectionProps) {
  const { addToast } = useToast();
  const [inherit, setInherit] = useState(player.cashout_24h_limit_override == null);
  const [limitInput, setLimitInput] = useState(
    player.cashout_24h_limit_override != null
      ? String(player.cashout_24h_limit_override)
      : '',
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [effective, setEffective] = useState(player.effective_cashout_24h_limit ?? null);
  const [usage, setUsage] = useState<Cashout24hLimitSnapshot | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(false);

  const loadUsage = useCallback(async () => {
    setIsUsageLoading(true);
    try {
      const snap = await cashout24hLimitApi.getPlayerUsage(player.id);
      setUsage(snap);
      // Prefer live snapshot for effective display when present.
      if (snap.cashout_24h_limit_source) {
        setEffective({
          amount: snap.cashout_24h_limit,
          source: snap.cashout_24h_limit_source,
        });
      }
    } catch {
      // Non-blocking — override editor still works from player fields.
    } finally {
      setIsUsageLoading(false);
    }
  }, [player.id]);

  useEffect(() => {
    setInherit(player.cashout_24h_limit_override == null);
    setLimitInput(
      player.cashout_24h_limit_override != null
        ? String(player.cashout_24h_limit_override)
        : '',
    );
    setEffective(player.effective_cashout_24h_limit ?? null);
    setFormError(null);
    void loadUsage();
  }, [player.id, player.cashout_24h_limit_override, player.effective_cashout_24h_limit, loadUsage]);

  const badgeIsOverride = effective?.source === 'player_override';

  const handleSave = async () => {
    setFormError(null);

    let payload: string | null = null;
    if (!inherit) {
      const trimmed = limitInput.trim();
      if (trimmed === '' || trimmed === '.') {
        setFormError('Enter a non-negative override amount, or enable inherit');
        return;
      }
      const parsed = Number.parseFloat(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFormError('Override must be 0.00 or greater');
        return;
      }
      payload = parsed.toFixed(2);
    }

    setIsSaving(true);
    try {
      const updated = await playersApi.update(player.id, {
        cashout_24h_limit_override: payload,
      });
      setEffective(updated.effective_cashout_24h_limit ?? null);
      setInherit(updated.cashout_24h_limit_override == null);
      setLimitInput(
        updated.cashout_24h_limit_override != null
          ? String(updated.cashout_24h_limit_override)
          : '',
      );
      onPlayerUpdated?.(updated);
      void loadUsage();
      addToast({
        type: 'success',
        title: 'Saved',
        description: `24h cashout limit for ${player.username} updated.`,
      });
    } catch (err) {
      let message = 'Failed to save 24h cashout override';
      if (err && typeof err === 'object') {
        const obj = err as Record<string, unknown>;
        if (typeof obj.cashout_24h_limit_override === 'string') {
          message = obj.cashout_24h_limit_override;
        } else if (
          Array.isArray(obj.cashout_24h_limit_override) &&
          obj.cashout_24h_limit_override[0]
        ) {
          message = String(obj.cashout_24h_limit_override[0]);
        } else if (err instanceof Error) {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setFormError(message);
      addToast({ type: 'error', title: 'Save failed', description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PlayerDetailPanel
      title="24h cashout limit"
      actions={
        <span
          className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            badgeIsOverride
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {badgeIsOverride ? 'Player override' : 'Company default'}
        </span>
      }
    >
      {canEdit ? (
        <div className="space-y-3">
          {formError ? (
            <div
              className="border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              role="alert"
            >
              {formError}
            </div>
          ) : null}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rolling 24-hour cashout policy for this player — not the wallet cashout limit
            (withdrawable balance). Completed and processing cashouts use allowance; pending
            requests do not.
          </p>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Inherit company 24-hour limit
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                When on, clears the player override (null).
              </p>
            </div>
            <Switch
              checked={inherit}
              onChange={(checked) => {
                setInherit(checked);
                setFormError(null);
              }}
              disabled={isSaving}
            />
          </div>

          <div>
            <label
              htmlFor={`cashout-24h-override-${player.id}`}
              className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              24-hour cashout limit override ($)
            </label>
            <Input
              id={`cashout-24h-override-${player.id}`}
              type="text"
              inputMode="decimal"
              value={inherit ? '' : limitInput}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '' || /^\d*\.?\d{0,2}$/.test(raw)) {
                  setLimitInput(raw);
                }
              }}
              placeholder="e.g. 10000.00"
              disabled={isSaving || inherit}
              aria-describedby={`cashout-24h-effective-${player.id}`}
            />
          </div>

          <p
            id={`cashout-24h-effective-${player.id}`}
            className="text-xs text-gray-600 dark:text-gray-300"
          >
            Effective:{' '}
            <span className="font-medium tabular-nums">
              {formatEffective(effective?.amount)}
            </span>
            {' · '}
            <span>{sourceLabel(effective?.source)}</span>
          </p>

          <div className="rounded-md border border-gray-100 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
            {isUsageLoading && !usage ? (
              <p>Loading usage…</p>
            ) : usage ? (
              <div className="space-y-0.5 tabular-nums">
                <p>
                  Completed (24h): {formatCurrency(usage.cashout_24h_completed_amount)}
                </p>
                <p>
                  Currently processing: {formatCurrency(usage.cashout_24h_reserved_amount)}
                </p>
                <p>
                  Available now:{' '}
                  {usage.cashout_24h_remaining_amount == null
                    ? 'Unlimited'
                    : formatCurrency(usage.cashout_24h_remaining_amount)}
                </p>
              </div>
            ) : (
              <p>Usage snapshot unavailable.</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" size="sm" isLoading={isSaving} onClick={() => void handleSave()}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <p>
            Override:{' '}
            {player.cashout_24h_limit_override == null
              ? 'Inherited'
              : formatCurrency(player.cashout_24h_limit_override)}
          </p>
          <p>
            Effective: {formatEffective(effective?.amount)} · {sourceLabel(effective?.source)}
          </p>
          {usage ? (
            <div className="space-y-0.5 tabular-nums text-[11px]">
              <p>Completed (24h): {formatCurrency(usage.cashout_24h_completed_amount)}</p>
              <p>Currently processing: {formatCurrency(usage.cashout_24h_reserved_amount)}</p>
              <p>
                Available now:{' '}
                {usage.cashout_24h_remaining_amount == null
                  ? 'Unlimited'
                  : formatCurrency(usage.cashout_24h_remaining_amount)}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </PlayerDetailPanel>
  );
}
