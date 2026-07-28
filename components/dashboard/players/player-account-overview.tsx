'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import { playersApi } from '@/lib/api';
import { Button, Input, Modal, useToast } from '@/components/ui';
import { hasMeaningfulWinningBalance } from '@/lib/chat/map-chat-api';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';

function formatCashoutLimitDisplay(limit: string | null | undefined): string {
  if (limit == null) return '—';
  const s = String(limit).trim();
  if (s === '' || s === '-') return '—';
  return formatCurrency(s);
}

function StatCell({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {action}
      </div>
      <div className="mt-1 min-w-0 text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {children}
      </div>
    </div>
  );
}

export interface PlayerAccountOverviewProps {
  playerId: number;
  balance?: string | number | null;
  cashoutLimit?: string | null;
  winningBalance?: string | number | null;
  isActive: boolean;
  agentLabel?: string | null;
  showAgent?: boolean;
  canEditCashoutLimit: boolean;
  onCashoutLimitUpdated: (cashout_limit: string | undefined) => void;
}

export function PlayerAccountOverview({
  playerId,
  balance,
  cashoutLimit,
  winningBalance,
  isActive,
  agentLabel,
  showAgent = true,
  canEditCashoutLimit,
  onCashoutLimitUpdated,
}: PlayerAccountOverviewProps) {
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const showWinnings = hasMeaningfulWinningBalance(winningBalance);
  const resolvedAgent = agentLabel?.trim() || 'Not assigned';
  const columnCount = 3 + (showWinnings ? 1 : 0) + (showAgent ? 1 : 0);

  const openModal = useCallback(() => {
    const raw = cashoutLimit != null ? String(cashoutLimit).trim() : '';
    setDraft(raw === '' || raw === '-' ? '' : raw);
    setModalOpen(true);
  }, [cashoutLimit]);

  const handleSave = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      addToast({
        type: 'error',
        title: 'Invalid amount',
        description: 'Enter a cashout limit (non-negative number).',
      });
      return;
    }
    const n = parseFloat(trimmed);
    if (Number.isNaN(n) || n < 0 || !Number.isFinite(n)) {
      addToast({
        type: 'error',
        title: 'Invalid amount',
        description: 'Enter a valid non-negative number.',
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await playersApi.update(playerId, { cashout_limit: trimmed });
      const next =
        updated.cashout_limit !== undefined && updated.cashout_limit !== null
          ? String(updated.cashout_limit)
          : trimmed;
      onCashoutLimitUpdated(next);
      addToast({
        type: 'success',
        title: 'Cashout limit updated',
        description: `Cashout limit is now ${formatCurrency(next)}.`,
      });
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update cashout limit';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setSaving(false);
    }
  }, [addToast, draft, onCashoutLimitUpdated, playerId]);

  return (
    <>
      <PlayerDetailPanel noPadding className="mb-3 sm:mb-4">
        <div
          className={`grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-gray-800 ${
            columnCount >= 5
              ? 'lg:grid-cols-5'
              : columnCount === 4
                ? 'lg:grid-cols-4'
                : 'lg:grid-cols-3'
          } lg:divide-y-0`}
        >
          <StatCell label="Balance">{formatCurrency(balance ?? 0)}</StatCell>

          <StatCell
            label="Cashout limit"
            action={
              canEditCashoutLimit ? (
                <button
                  type="button"
                  onClick={openModal}
                  className="p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Edit cashout limit"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              ) : null
            }
          >
            {formatCashoutLimitDisplay(cashoutLimit)}
          </StatCell>

          {showWinnings ? (
            <StatCell label="Winnings">{formatCurrency(winningBalance ?? 0)}</StatCell>
          ) : null}

          <StatCell label="Status">
            <span
              className={`inline-flex border px-2 py-0.5 text-[11px] font-medium ${
                isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </StatCell>

          {showAgent ? (
            <StatCell label="Agent">
              <span className="block truncate text-sm font-semibold">{resolvedAgent}</span>
            </StatCell>
          ) : null}
        </div>
      </PlayerDetailPanel>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title="Edit cashout limit"
        size="sm"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={() => void handleSave()} isLoading={saving}>
              Save
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Enter the maximum amount this player can cash out (USD).
        </p>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="0.00"
          disabled={saving}
          inputMode="decimal"
          autoComplete="off"
        />
      </Modal>
    </>
  );
}
