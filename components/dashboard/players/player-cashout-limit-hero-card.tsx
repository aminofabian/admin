'use client';

import { useCallback, useState } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import { playersApi } from '@/lib/api';
import { Button, Input, Modal, useToast } from '@/components/ui';

function formatCashoutLimitDisplay(limit: string | null | undefined): string {
  if (limit == null) return '—';
  const s = String(limit).trim();
  if (s === '' || s === '-') return '—';
  return formatCurrency(s);
}

export interface PlayerCashoutLimitHeroCardProps {
  playerId: number;
  cashoutLimit?: string | null;
  canEdit: boolean;
  onUpdated: (cashout_limit: string | undefined) => void;
}

export function PlayerCashoutLimitHeroCard({
  playerId,
  cashoutLimit,
  canEdit,
  onUpdated,
}: PlayerCashoutLimitHeroCardProps) {
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

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
      onUpdated(next);
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
  }, [addToast, draft, onUpdated, playerId]);

  return (
    <>
      <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
          <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
            <svg
              className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 justify-between min-w-0">
              <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                Cashout limit
              </p>
              {canEdit ? (
                <button
                  type="button"
                  onClick={openModal}
                  className="shrink-0 p-0.5 sm:p-1 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-200/80 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-700/80 transition-colors touch-manipulation"
                  aria-label="Edit cashout limit"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs sm:text-sm md:text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {formatCashoutLimitDisplay(cashoutLimit)}
            </p>
          </div>
        </div>
      </div>

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
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
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
