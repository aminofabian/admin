'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoulettePlayerSpinAllowanceStore } from '@/stores';
import { playerRouletteSpinBalancesApi } from '@/lib/api/roulette-player-spin-balances';
import {
  pickPlayerRouletteSpinInfo,
  type PlayerRouletteSpinInfo,
} from '@/lib/roulette/player-spin-allowance-info';

/** Load spin snapshot from player-spin-allowances and player-spin-balances. */
export function usePlayerRouletteSpinInfo(playerId: number | null | undefined) {
  const { byPlayerId, fetchForPlayer } = useRoulettePlayerSpinAllowanceStore();
  const [balanceSpinInfo, setBalanceSpinInfo] = useState<PlayerRouletteSpinInfo | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const numericId =
    playerId != null && !Number.isNaN(playerId) ? playerId : null;
  const entry = numericId != null ? byPlayerId[numericId] : undefined;

  const fetchBalanceSnapshot = useCallback(async () => {
    if (numericId == null) {
      setBalanceSpinInfo(null);
      setBalanceError(null);
      return;
    }

    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const record = await playerRouletteSpinBalancesApi.get(numericId);
      setBalanceSpinInfo(record ? pickPlayerRouletteSpinInfo(record) : null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load spin balance';
      setBalanceError(message);
      setBalanceSpinInfo(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    if (numericId == null) return;
    void fetchForPlayer(numericId);
    void fetchBalanceSnapshot();
  }, [fetchForPlayer, fetchBalanceSnapshot, numericId]);

  const allowanceSpinInfo = useMemo(() => {
    if (!entry?.allowance) return null;
    return pickPlayerRouletteSpinInfo(entry.allowance);
  }, [entry?.allowance]);

  const spinInfo = allowanceSpinInfo ?? balanceSpinInfo;
  const isLoading = (entry?.isLoading ?? false) || balanceLoading;
  const error = entry?.error ?? balanceError;

  const refresh = useCallback(async () => {
    if (numericId == null) return;
    await Promise.all([fetchForPlayer(numericId), fetchBalanceSnapshot()]);
  }, [numericId, fetchForPlayer, fetchBalanceSnapshot]);

  return {
    allowance: entry?.allowance ?? null,
    spinInfo,
    isLoading,
    error,
    refresh,
  };
}
