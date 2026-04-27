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

function savedMethodTitle(method: SavedPaymentMethod): string {
  const legacy =
    method.payment_method_display?.trim() || method.payment_method?.trim();
  if (legacy) {
    return formatPaymentMethod(legacy);
  }
  const typePart = method.method_type?.trim()
    ? formatPaymentMethod(method.method_type)
    : '';
  const providerPart = method.provider_code?.trim()
    ? formatPaymentMethod(method.provider_code)
    : '';
  if (typePart && providerPart) {
    return `${typePart} · ${providerPart}`;
  }
  return typePart || providerPart || 'Saved payment method';
}

function cardDisplayLine(method: SavedPaymentMethod): string | null {
  const masked = method.masked_card?.trim();
  if (masked) {
    return masked;
  }
  const last4 = method.card_last4?.trim();
  if (last4) {
    return `•••• ${last4}`;
  }
  return null;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

function savedMethodDetailLines(method: SavedPaymentMethod): string[] {
  const lines: string[] = [];
  const holder =
    method.card_holder_name?.trim() ||
    method.account_holder_name?.trim() ||
    method.account_name?.trim();
  if (holder) {
    lines.push(holder);
  }
  const accountLine =
    method.account_number?.trim() ||
    method.account_info?.trim() ||
    firstNonEmpty(method.paypal_email, method.payer_email, method.customer_email, method.email) ||
    cardDisplayLine(method);
  if (accountLine) {
    lines.push(accountLine);
  }
  const providerReference = firstNonEmpty(method.provider_ref_id, method.provider_player_ref);
  if (providerReference) {
    lines.push(`Ref: ${providerReference}`);
  }
  if (method.expiry_date?.trim()) {
    lines.push(`Expires ${method.expiry_date.trim()}`);
  }
  return lines;
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
            {savedPaymentMethods.map((method) => {
              const iconKey =
                method.payment_method ||
                method.method_type ||
                method.provider_code;
              const detailLines = savedMethodDetailLines(method);
              return (
                <div
                  key={method.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mt-0.5">
                    {getPaymentMethodIcon(iconKey, {
                      size: 'md',
                      methodType: method.method_type ?? null,
                      providerPaymentMethod: method.provider_code ?? null,
                      asInitialFallback: true,
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {savedMethodTitle(method)}
                      </p>
                      {method.is_default && (
                        <Badge variant="info" className="text-[9px] px-1.5 py-0">
                          Default
                        </Badge>
                      )}
                      {method.is_active === false && (
                        <Badge variant="danger" className="text-[9px] px-1.5 py-0">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {detailLines.length > 0 ? (
                      <div className="mt-1 space-y-0.5">
                        {detailLines.map((line, i) => (
                          <p
                            key={`${method.id}-line-${i}`}
                            className="text-xs text-gray-500 dark:text-gray-400 break-words"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
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
