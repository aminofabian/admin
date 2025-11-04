'use client';

import { Modal } from '@/components/ui';
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Transaction Queue"
    >
      <GameActionForm
        queue={queue}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </Modal>
  );
}
