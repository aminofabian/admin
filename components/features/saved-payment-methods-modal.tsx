'use client';

import { Modal, Button, Badge } from '@/components/ui';
import type { SavedPaymentMethod } from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';
import { getPaymentMethodIcon } from '@/lib/utils/payment-method-icons';

interface SavedPaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerUsername: string;
  savedPaymentMethods: SavedPaymentMethod[];
}

export function SavedPaymentMethodsModal({
  isOpen,
  onClose,
  playerUsername,
  savedPaymentMethods,
}: SavedPaymentMethodsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Saved Payment Methods">
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Player</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
            {playerUsername}
          </p>
        </div>

        {savedPaymentMethods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No saved payment methods
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-[240px]">
              This player hasn&apos;t saved any payment methods yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {savedPaymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {getPaymentMethodIcon(method.payment_method, {
                    size: 'md',
                    asInitialFallback: true,
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {formatPaymentMethod(method.payment_method_display || method.payment_method)}
                    </p>
                    {method.is_default && (
                      <Badge variant="info" className="text-[9px] px-1.5 py-0">
                        Default
                      </Badge>
                    )}
                  </div>
                  {(method.account_name || method.account_number || method.account_info) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {method.account_name || method.account_number || method.account_info}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
