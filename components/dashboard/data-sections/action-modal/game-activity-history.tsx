'use client';

import { Drawer } from '@/components/ui';
import { GameActionForm } from '@/components/features';
import type { TransactionQueue, GameActionType } from '@/types';

interface ActionModalProps {
  isOpen: boolean;
  queue: TransactionQueue | null;
  onSubmit: (data: {
    txn_id: string | number;
    type: GameActionType;
    new_password?: string;
    new_balance?: string;
    new_username?: string;
    game_username?: string;
    game_password?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function ActionModal({ isOpen, queue, onSubmit, onClose }: ActionModalProps) {
  const handleCancel = () => {
    onClose();
  };

  const handleSubmit = async (data: {
    txn_id: string | number;
    type: GameActionType;
    new_password?: string;
    new_balance?: string;
    new_username?: string;
    game_username?: string;
    game_password?: string;
  }) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      // Don't close modal on error - let user retry
      throw error;
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Transaction Queue"
      size="lg"
    >
      <GameActionForm
        queue={queue}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </Drawer>
  );
}
