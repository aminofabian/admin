'use client';

import { useState } from 'react';
import { Button, ConfirmModal, useToast } from '@/components/ui';
import { playersApi } from '@/lib/api';
import {
  getAdminIdentityVerificationAction,
  getAdminVerificationBlockReason,
  getPlayerIdentityStatusLabel,
} from '@/lib/players/player-verification';
import type { Player } from '@/types';

interface PlayerVerificationActionsProps {
  player: Player;
  canEdit: boolean;
  onUpdated: (player: Player) => void;
}

function getIdentityActionLabel(action: 'mark' | 'unmark'): string {
  return action === 'mark' ? 'Mark identity verified' : 'Reset identity status';
}

export function PlayerVerificationActions({
  player,
  canEdit,
  onUpdated,
}: PlayerVerificationActionsProps) {
  const { addToast } = useToast();
  const [pendingAction, setPendingAction] = useState<'mark' | 'unmark' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const identityAction = getAdminIdentityVerificationAction(player);

  if (!canEdit || !identityAction) return null;

  const handleConfirm = async () => {
    if (!pendingAction) return;

    const blockReason = getAdminVerificationBlockReason(player);
    if (blockReason) {
      addToast({
        type: 'error',
        title: 'Action not allowed',
        description: blockReason,
      });
      setPendingAction(null);
      return;
    }

    const nextVerified = pendingAction === 'mark';

    setIsSaving(true);
    try {
      const refreshed = await playersApi.updateVerification(player.id, nextVerified);
      onUpdated(refreshed);

      addToast({
        type: 'success',
        title: 'Identity verification updated',
        description: nextVerified
          ? 'Identity marked as verified.'
          : 'Identity reset to not submitted.',
      });
      setPendingAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update verification status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmModal = (
    <ConfirmModal
      isOpen={pendingAction !== null}
      onClose={() => !isSaving && setPendingAction(null)}
      onConfirm={handleConfirm}
      title={
        pendingAction === 'unmark'
          ? 'Mark identity as not submitted?'
          : 'Mark identity as verified?'
      }
      description={
        pendingAction === 'unmark'
          ? `Reset identity verification for "${player.username}" to not submitted? Current status: ${getPlayerIdentityStatusLabel(player)}.`
          : `Manually approve identity verification for "${player.username}"?`
      }
      confirmText={pendingAction === 'mark' ? 'Mark verified' : 'Mark unverified'}
      variant={pendingAction === 'mark' ? 'info' : 'warning'}
      isLoading={isSaving}
    />
  );

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setPendingAction(identityAction)}
        disabled={isSaving}
        className="flex items-center gap-1.5 px-3 py-2"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        {getIdentityActionLabel(identityAction)}
      </Button>
      {confirmModal}
    </>
  );
}
