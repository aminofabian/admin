'use client';

import { useState } from 'react';
import { Button, ConfirmModal, useToast } from '@/components/ui';
import { playersApi } from '@/lib/api';
import type { Player } from '@/types';

interface PlayerClearSsnHashButtonProps {
  player: Player;
  canClear: boolean;
  onUpdated: (player: Player) => void;
}

export function PlayerClearSsnHashButton({
  player,
  canClear,
  onUpdated,
}: PlayerClearSsnHashButtonProps) {
  const { addToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  if (!canClear) return null;

  const last4 = player.ssn_last4?.trim();
  const last4Label = last4 ? ` Ending ${last4}.` : '';

  const handleConfirm = async () => {
    setIsClearing(true);
    try {
      const refreshed = await playersApi.clearSsnHash(player.id);
      onUpdated(refreshed);
      addToast({
        type: 'success',
        title: 'SSN hash cleared',
        description:
          'The same SSN can now be used by another player. Use this after verifying an email-change request.',
      });
      setIsConfirmOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear SSN hash';
      addToast({
        type: 'error',
        title: 'Clear failed',
        description: message,
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isClearing}
        className="flex items-center gap-1.5 px-3 py-1.5"
        aria-label="Clear SSN hash"
      >
        Clear SSN Hash
      </Button>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => !isClearing && setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Clear SSN hash?"
        description={`Remove the stored SSN hash for "${player.username}"?${last4Label} The same SSN can then be used by another player. This cannot be undone.`}
        confirmText="Clear SSN Hash"
        variant="warning"
        isLoading={isClearing}
      />
    </>
  );
}
