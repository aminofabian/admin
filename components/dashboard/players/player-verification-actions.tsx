'use client';

import { useState } from 'react';
import { Button, ConfirmModal, DropdownMenu, DropdownMenuItem, useToast } from '@/components/ui';
import { playersApi } from '@/lib/api';
import {
  buildIdentityVerificationPatch,
  buildPhoneVerificationPatch,
  getPlayerIdentityStatusLabel,
  isPlayerIdentityVerified,
  isPlayerPhoneVerified,
} from '@/lib/players/player-verification';
import type { Player } from '@/types';

type VerificationTarget = 'phone' | 'identity';

interface PlayerVerificationActionsProps {
  player: Player;
  canEdit: boolean;
  onUpdated: (player: Player) => void;
  variant?: 'menu' | 'buttons';
}

export function PlayerVerificationActions({
  player,
  canEdit,
  onUpdated,
  variant = 'menu',
}: PlayerVerificationActionsProps) {
  const { addToast } = useToast();
  const [pendingTarget, setPendingTarget] = useState<VerificationTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!canEdit) return null;

  const phoneVerified = isPlayerPhoneVerified(player);
  const identityVerified = isPlayerIdentityVerified(player);

  const handleConfirm = async () => {
    if (!pendingTarget) return;

    setIsSaving(true);
    try {
      const patch =
        pendingTarget === 'phone'
          ? buildPhoneVerificationPatch(!phoneVerified)
          : buildIdentityVerificationPatch(!identityVerified);

      const updatedPlayer = await playersApi.update(player.id, patch);
      onUpdated({ ...player, ...updatedPlayer });

      addToast({
        type: 'success',
        title: pendingTarget === 'phone' ? 'Phone verification updated' : 'Identity verification updated',
        description:
          pendingTarget === 'phone'
            ? phoneVerified
              ? 'Phone marked as unverified.'
              : 'Phone marked as verified.'
            : identityVerified
              ? 'Identity marked as not submitted.'
              : 'Identity marked as verified.',
      });
      setPendingTarget(null);
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

  const pendingVerified =
    pendingTarget === 'phone' ? !phoneVerified : pendingTarget === 'identity' ? !identityVerified : null;

  const confirmModal = (
    <ConfirmModal
      isOpen={pendingTarget !== null}
      onClose={() => !isSaving && setPendingTarget(null)}
      onConfirm={handleConfirm}
      title={
        pendingTarget === 'phone'
          ? phoneVerified
            ? 'Mark phone as unverified?'
            : 'Mark phone as verified?'
          : identityVerified
            ? 'Mark identity as not submitted?'
            : 'Mark identity as verified?'
      }
      description={
        pendingTarget === 'phone'
          ? phoneVerified
            ? `Remove phone verification for "${player.username}"? They may need to verify again.`
            : `Manually mark the phone number for "${player.username}" as verified?`
          : identityVerified
            ? `Reset identity verification for "${player.username}" to not submitted? Current status: ${getPlayerIdentityStatusLabel(player)}.`
            : `Manually approve identity verification for "${player.username}"?`
      }
      confirmText={pendingVerified ? 'Mark verified' : 'Mark unverified'}
      variant={pendingVerified ? 'info' : 'warning'}
      isLoading={isSaving}
    />
  );

  if (variant === 'buttons') {
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPendingTarget('phone')}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-2"
        >
          {phoneVerified ? 'Unverify phone' : 'Verify phone'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPendingTarget('identity')}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-2"
        >
          {identityVerified ? 'Unverify identity' : 'Verify identity'}
        </Button>
        {confirmModal}
      </>
    );
  }

  return (
    <>
      <DropdownMenu
        align="right"
        trigger={
          <Button
            variant="secondary"
            size="sm"
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
            Manage KYC
            <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        }
      >
        <DropdownMenuItem onClick={() => setPendingTarget('phone')} className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          {phoneVerified ? 'Mark phone unverified' : 'Mark phone verified'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPendingTarget('identity')} className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          {identityVerified ? 'Reset identity status' : 'Mark identity verified'}
        </DropdownMenuItem>
      </DropdownMenu>
      {confirmModal}
    </>
  );
}
