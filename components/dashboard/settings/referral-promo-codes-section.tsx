'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReferralPromoCodesStore } from '@/stores';
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@/components/ui';

const CODE_PATTERN = /^[A-Za-z0-9]{5,10}$/;

export function ReferralPromoCodesSection() {
  const { addToast } = useToast();
  const {
    promoCodes,
    isLoading,
    isSaving,
    error,
    fetchPromoCodes,
    createPromoCode,
    deactivatePromoCode,
  } = useReferralPromoCodesStore();

  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  useEffect(() => {
    void fetchPromoCodes();
  }, [fetchPromoCodes]);

  const activeCodes = useMemo(
    () => promoCodes.filter((item) => item.is_active),
    [promoCodes],
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();

    if (!CODE_PATTERN.test(trimmed)) {
      setFormError('Promo code must be 5–10 alphanumeric characters');
      return;
    }

    setFormError(null);
    try {
      await createPromoCode({ code: trimmed });
      setCode('');
      addToast({ type: 'success', title: 'Promo code created', description: trimmed });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Could not create promo code',
      });
    }
  };

  const handleDeactivate = async (id: number, label: string) => {
    setDeactivatingId(id);
    try {
      await deactivatePromoCode(id);
      addToast({
        type: 'success',
        title: 'Promo code deactivated',
        description: label,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Deactivate failed',
        description: err instanceof Error ? err.message : 'Could not deactivate promo code',
      });
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Custom Promo Codes
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Generate 5–10 character promo codes for signup. Deleting a code deactivates it.
        </p>
      </div>

      <form onSubmit={(e) => void handleCreate(e)} className="border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="promo-code"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              New promo code
            </label>
            <Input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VIP2026"
              maxLength={10}
              disabled={isSaving}
              className="font-mono uppercase tracking-wider"
            />
            {formError ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formError}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                5–10 letters or numbers
              </p>
            )}
          </div>
          <Button type="submit" disabled={isSaving || !code.trim()}>
            {isSaving ? 'Creating…' : 'Create code'}
          </Button>
        </div>
      </form>

      <div className="p-6">
        {error && !isLoading ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="ml-3"
              onClick={() => void fetchPromoCodes()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {isLoading && activeCodes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading promo codes…</p>
        ) : activeCodes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No active promo codes yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed-up players</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCodes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-mono font-semibold tracking-wider">{item.code}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'success' : 'danger'}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums">{item.total_signed_up_players}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isSaving || deactivatingId === item.id}
                        isLoading={deactivatingId === item.id}
                        onClick={() => void handleDeactivate(item.id, item.code)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
