'use client';

import { useEffect, useState } from 'react';
import { useReferralPromoCodesStore } from '@/stores';
import { Button, ConfirmModal, Input, useToast } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import type { ReferralPromoCode } from '@/types';

const CODE_PATTERN = /^[A-Za-z0-9]{5,10}$/;

type PendingDelete = { id: number; code: string };
type EditingBonus = { id: number; code: string; signup_bonus_amount: string };

type Props = {
  /** Hide outer title when wrapped by a parent section */
  embedded?: boolean;
};

export function ReferralPromoCodesSection({ embedded = false }: Props) {
  const { addToast } = useToast();
  const {
    promoCodes,
    isLoading,
    isSaving,
    error,
    fetchPromoCodes,
    createPromoCode,
    updatePromoCode,
    setPromoCodeActive,
    deletePromoCode,
  } = useReferralPromoCodesStore();

  const [code, setCode] = useState('');
  const [signupBonusAmount, setSignupBonusAmount] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<
    'deactivate' | 'reactivate' | 'delete' | 'edit' | null
  >(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [editingBonus, setEditingBonus] = useState<EditingBonus | null>(null);

  useEffect(() => {
    void fetchPromoCodes();
  }, [fetchPromoCodes]);

  const parseBonusAmount = (raw: string): number | null => {
    if (raw === '' || raw === '.') return 0;
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    return parsed;
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    const bonus = parseBonusAmount(signupBonusAmount);

    if (!CODE_PATTERN.test(trimmed)) {
      setFormError('Code must be 5–10 letters or numbers');
      return;
    }
    if (bonus == null) {
      setFormError('Bonus must be 0 or greater');
      return;
    }

    setFormError(null);
    try {
      await createPromoCode({ code: trimmed, signup_bonus_amount: bonus });
      setCode('');
      setSignupBonusAmount('0');
      addToast({
        type: 'success',
        title: 'Code created',
        description: `${trimmed} · ${formatCurrency(bonus)}`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not create',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleSetActive = async (id: number, label: string, isActive: boolean) => {
    setActionId(id);
    setActionType(isActive ? 'reactivate' : 'deactivate');
    try {
      await setPromoCodeActive(id, isActive);
      addToast({
        type: 'success',
        title: isActive ? 'Reactivated' : 'Deactivated',
        description: label,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleEditBonus = (item: ReferralPromoCode) => {
    setEditingBonus({
      id: item.id,
      code: item.code,
      signup_bonus_amount: String(item.signup_bonus_amount ?? '0'),
    });
  };

  const handleSaveBonus = async () => {
    if (!editingBonus) return;
    const bonus = parseBonusAmount(editingBonus.signup_bonus_amount);
    if (bonus == null) {
      addToast({ type: 'error', title: 'Bonus must be 0 or greater' });
      return;
    }

    setActionId(editingBonus.id);
    setActionType('edit');
    try {
      await updatePromoCode(editingBonus.id, { signup_bonus_amount: bonus });
      setEditingBonus(null);
      addToast({
        type: 'success',
        title: 'Bonus updated',
        description: `${editingBonus.code} · ${formatCurrency(bonus)}`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not update',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    const { id, code: label } = pendingDelete;
    setActionId(id);
    setActionType('delete');
    try {
      await deletePromoCode(id);
      setPendingDelete(null);
      addToast({ type: 'success', title: 'Deleted', description: label });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete';
      const wasSoftDeleted = message.toLowerCase().includes('deactivated instead');
      setPendingDelete(null);
      addToast({
        type: wasSoftDeleted ? 'warning' : 'error',
        title: wasSoftDeleted ? 'Deactivated instead' : 'Could not delete',
        description: message,
      });
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  return (
    <div className="space-y-5">
      {!embedded ? (
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Promo codes</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Custom codes with a per-code signup bonus.
          </p>
        </div>
      ) : null}

      {/* Create */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">New code</p>
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. VIP2026"
            maxLength={10}
            disabled={isSaving}
            aria-label="Promo code"
            className="font-mono uppercase tracking-wider sm:w-40"
          />
          <div className="relative sm:w-24">
            <Input
              type="text"
              inputMode="decimal"
              value={signupBonusAmount}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '' || /^\d*\.?\d*$/.test(raw)) setSignupBonusAmount(raw);
              }}
              onBlur={() => {
                if (signupBonusAmount === '' || signupBonusAmount === '.') {
                  setSignupBonusAmount('0');
                }
              }}
              placeholder="0.00"
              disabled={isSaving}
              aria-label="Signup bonus"
              className="pr-6 text-right tabular-nums"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              $
            </span>
          </div>
          <Button type="submit" size="sm" disabled={isSaving || !code.trim()}>
            {isSaving && actionId == null ? 'Adding…' : 'Add'}
          </Button>
        </form>
        {formError ? <p className="text-xs text-red-600 dark:text-red-400">{formError}</p> : null}
      </div>

      {error && !isLoading ? (
        <div className="flex items-center justify-between gap-3 text-sm text-red-600 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => void fetchPromoCodes()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* List */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          All codes
          {promoCodes.length > 0 ? ` · ${promoCodes.length}` : ''}
        </p>

        {isLoading && promoCodes.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">Loading…</p>
        ) : promoCodes.length === 0 ? (
          <p className="py-4 text-sm text-gray-500 dark:text-gray-400">No codes yet.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
              {promoCodes.map((item) => {
                const isRowBusy = actionId === item.id;
                const isEditing = editingBonus?.id === item.id;

                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-700 dark:bg-gray-900/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">
                          {item.code}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${
                            item.is_active
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Off'}
                        </p>
                      </div>
                      <p className="text-xs tabular-nums text-gray-500">
                        {item.total_signed_up_players}{' '}
                        {item.total_signed_up_players === 1 ? 'player' : 'players'}
                      </p>
                    </div>

                    <div className="mt-3 space-y-3 border-t border-gray-200/80 pt-3 dark:border-gray-700">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Bonus</p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-24">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={editingBonus.signup_bonus_amount}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                    setEditingBonus((prev) =>
                                      prev ? { ...prev, signup_bonus_amount: raw } : prev,
                                    );
                                  }
                                }}
                                className="h-8 pr-5 text-right text-xs tabular-nums"
                                disabled={isSaving}
                              />
                              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                $
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSaving}
                              isLoading={isRowBusy && actionType === 'edit'}
                              onClick={() => void handleSaveBonus()}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => setEditingBonus(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium tabular-nums text-gray-800 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                            onClick={() => handleEditBonus(item)}
                          >
                            {formatCurrency(item.signup_bonus_amount)}
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          disabled={isSaving}
                          isLoading={
                            isRowBusy &&
                            (actionType === 'deactivate' || actionType === 'reactivate')
                          }
                          onClick={() =>
                            void handleSetActive(item.id, item.code, !item.is_active)
                          }
                        >
                          {item.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="flex-1"
                          disabled={isSaving}
                          isLoading={isRowBusy && actionType === 'delete'}
                          onClick={() => setPendingDelete({ id: item.id, code: item.code })}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[34%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Code
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Bonus
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Players
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Status
                    </th>
                    <th className="py-2.5 pl-4 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {promoCodes.map((item, index) => {
                    const isRowBusy = actionId === item.id;
                    const isEditing = editingBonus?.id === item.id;
                    const isLast = index === promoCodes.length - 1;

                    return (
                      <tr
                        key={item.id}
                        className={
                          isLast
                            ? undefined
                            : 'border-b border-gray-100 dark:border-gray-800'
                        }
                      >
                        <td className="py-3 pr-4 align-middle">
                          <span className="font-mono text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">
                            {item.code}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center justify-end">
                              <div className="relative w-[4.75rem]">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={editingBonus.signup_bonus_amount}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                      setEditingBonus((prev) =>
                                        prev ? { ...prev, signup_bonus_amount: raw } : prev,
                                      );
                                    }
                                  }}
                                  className="h-8 pr-5 text-right text-xs tabular-nums"
                                  disabled={isSaving}
                                />
                                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                  $
                                </span>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex min-w-[4.5rem] items-center justify-end rounded-md px-2 py-1 text-sm tabular-nums text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                              onClick={() => handleEditBonus(item)}
                              title="Edit bonus"
                            >
                              {formatCurrency(item.signup_bonus_amount)}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle text-right tabular-nums text-gray-600 dark:text-gray-400">
                          {item.total_signed_up_players}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span
                            className={`inline-block text-xs font-medium ${
                              item.is_active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Off'}
                          </span>
                        </td>
                        <td className="py-3 pl-4 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isSaving}
                                  isLoading={isRowBusy && actionType === 'edit'}
                                  onClick={() => void handleSaveBonus()}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={isSaving}
                                  onClick={() => setEditingBonus(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={isSaving}
                                  isLoading={
                                    isRowBusy &&
                                    (actionType === 'deactivate' ||
                                      actionType === 'reactivate')
                                  }
                                  onClick={() =>
                                    void handleSetActive(item.id, item.code, !item.is_active)
                                  }
                                >
                                  {item.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  disabled={isSaving}
                                  isLoading={isRowBusy && actionType === 'delete'}
                                  onClick={() =>
                                    setPendingDelete({ id: item.id, code: item.code })
                                  }
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={pendingDelete != null}
        onClose={() => {
          if (actionType === 'delete') return;
          setPendingDelete(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
        title="Delete promo code"
        description={
          pendingDelete
            ? `Delete “${pendingDelete.code}”? This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionType === 'delete'}
      />
    </div>
  );
}
