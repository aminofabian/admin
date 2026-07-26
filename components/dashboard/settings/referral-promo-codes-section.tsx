'use client';

import { useEffect, useState } from 'react';
import { useReferralPromoCodesStore } from '@/stores';
import {
  Badge,
  Button,
  ConfirmModal,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import type { ReferralPromoCode } from '@/types';

const CODE_PATTERN = /^[A-Za-z0-9]{5,10}$/;

type PendingDelete = {
  id: number;
  code: string;
};

type EditingBonus = {
  id: number;
  code: string;
  signup_bonus_amount: string;
};

export function ReferralPromoCodesSection() {
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
  const [actionType, setActionType] = useState<'deactivate' | 'reactivate' | 'delete' | 'edit' | null>(
    null,
  );
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
      setFormError('Use 5–10 letters or numbers');
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
        title: 'Promo code created',
        description: `${trimmed} · ${formatCurrency(bonus)} signup bonus`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Could not create promo code',
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
        title: isActive ? 'Promo code reactivated' : 'Promo code deactivated',
        description: label,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: isActive ? 'Reactivate failed' : 'Deactivate failed',
        description: err instanceof Error ? err.message : 'Could not update promo code',
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
      addToast({ type: 'error', title: 'Signup bonus must be 0 or greater' });
      return;
    }

    setActionId(editingBonus.id);
    setActionType('edit');
    try {
      await updatePromoCode(editingBonus.id, { signup_bonus_amount: bonus });
      setEditingBonus(null);
      addToast({
        type: 'success',
        title: 'Signup bonus updated',
        description: `${editingBonus.code} · ${formatCurrency(bonus)}`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update signup bonus',
      });
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleDeleteRequest = (id: number, label: string) => {
    setPendingDelete({ id, code: label });
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;

    const { id, code: label } = pendingDelete;
    setActionId(id);
    setActionType('delete');
    try {
      await deletePromoCode(id);
      setPendingDelete(null);
      addToast({
        type: 'success',
        title: 'Promo code deleted',
        description: label,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete promo code';
      const wasSoftDeleted = message.toLowerCase().includes('deactivated instead');
      setPendingDelete(null);
      addToast({
        type: wasSoftDeleted ? 'warning' : 'error',
        title: wasSoftDeleted ? 'Deactivated instead of deleted' : 'Delete failed',
        description: message,
      });
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const activeCount = promoCodes.filter((c) => c.is_active).length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-gray-700">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Custom codes
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            5–10 character codes with a per-code signup bonus.
            {promoCodes.length > 0 ? (
              <>
                {' '}
                {activeCount} active · {promoCodes.length} total
              </>
            ) : null}
          </p>
        </div>

        <form
          onSubmit={(e) => void handleCreate(e)}
          className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
        >
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code"
            maxLength={10}
            disabled={isSaving}
            aria-label="New promo code"
            className="font-mono uppercase tracking-wider sm:w-36"
          />
          <div className="relative sm:w-28">
            <Input
              id="signup-bonus-amount"
              type="text"
              inputMode="decimal"
              value={signupBonusAmount}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                  setSignupBonusAmount(raw);
                }
              }}
              onBlur={() => {
                if (signupBonusAmount === '' || signupBonusAmount === '.') {
                  setSignupBonusAmount('0');
                }
              }}
              placeholder="0.00"
              disabled={isSaving}
              aria-label="Signup bonus amount"
              className="pr-7"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              $
            </span>
          </div>
          <Button type="submit" size="sm" disabled={isSaving || !code.trim()}>
            {isSaving && actionId == null ? 'Creating…' : 'Add'}
          </Button>
        </form>
      </div>

      {formError ? (
        <p className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {formError}
        </p>
      ) : null}

      <div className="px-5 py-4">
        {error && !isLoading ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <span>{error}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchPromoCodes()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isLoading && promoCodes.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading promo codes…
          </p>
        ) : promoCodes.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No promo codes yet. Create one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signup bonus</TableHead>
                  <TableHead className="text-right">Players</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((item) => {
                  const isRowBusy = actionId === item.id;
                  const isEditing = editingBonus?.id === item.id;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold tracking-wider">
                          {item.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? 'success' : 'danger'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
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
                              className="w-24"
                              disabled={isSaving}
                            />
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
                            className="tabular-nums text-sm text-gray-700 underline-offset-2 hover:text-blue-600 hover:underline dark:text-gray-300 dark:hover:text-blue-400"
                            onClick={() => handleEditBonus(item)}
                            title="Edit signup bonus"
                          >
                            {formatCurrency(item.signup_bonus_amount)}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular-nums text-sm">
                          {item.total_signed_up_players}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {item.is_active ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isSaving}
                              isLoading={isRowBusy && actionType === 'deactivate'}
                              onClick={() => void handleSetActive(item.id, item.code, false)}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isSaving}
                              isLoading={isRowBusy && actionType === 'reactivate'}
                              onClick={() => void handleSetActive(item.id, item.code, true)}
                            >
                              Reactivate
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={isSaving}
                            isLoading={isRowBusy && actionType === 'delete'}
                            onClick={() => handleDeleteRequest(item.id, item.code)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
            ? `Permanently delete promo code "${pendingDelete.code}"? This cannot be undone.`
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
