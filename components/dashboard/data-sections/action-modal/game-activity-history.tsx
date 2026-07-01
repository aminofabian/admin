'use client';

import { Drawer } from '@/components/ui';
import { GameActionForm } from '@/components/features';
import type { TransactionQueue, GameActionType, GameActionRequest } from '@/types';

interface ActionModalProps {
  isOpen: boolean;
  queue: TransactionQueue | null;
  onSubmit: (data: GameActionRequest) => Promise<void>;
  onClose: () => void;
}

export function ActionModal({ isOpen, queue, onSubmit, onClose }: ActionModalProps) {
  const handleCancel = () => {
    onClose();
  };

  const handleSubmit = async (data: GameActionRequest) => {
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
