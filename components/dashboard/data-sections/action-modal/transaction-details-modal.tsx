'use client';

import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { Transaction } from '@/types';
import { PROJECT_DOMAIN } from '@/lib/constants/api';
import { playersApi } from '@/lib/api';
import {
  DetailsModalWrapper,
  DetailsCard,
  DetailsHeader,
  DetailsRow,
  DetailsField,
  DetailsHighlightBox,
  DetailsAmountBox,
  DetailsRemarks,
  DetailsCloseButton,
} from './details-modal-wrapper';

const CRYPTO_PAYMENT_METHODS = ['bitcoin', 'litecoin', 'bitcoin_lightning', 'crypto'];

const parseNumericValue = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return null;
  }

  const parsedValue = Number(trimmed);

  return Number.isNaN(parsedValue) ? null : parsedValue;
};

interface TransactionDetailsModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  isActionLoading?: boolean;
}

export const TransactionDetailsModal = memo(function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  onComplete,
  onCancel,
  isActionLoading = false,
}: TransactionDetailsModalProps) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isLoadingPlayerId, setIsLoadingPlayerId] = useState(false);

  // Fetch player ID from username when modal opens
  useEffect(() => {
    if (!isOpen || !transaction.user_username || playerId) {
      return;
    }

    const fetchPlayerId = async () => {
      setIsLoadingPlayerId(true);
      try {
        // Search for player by username
        const response = await playersApi.list({ username: transaction.user_username, page_size: 1 });
        if (response?.results && response.results.length > 0) {
          setPlayerId(response.results[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch player ID:', error);
      } finally {
        setIsLoadingPlayerId(false);
      }
    };

    fetchPlayerId();
  }, [isOpen, transaction.user_username, playerId]);

  // Memoize expensive computations
  const isPurchase = useMemo(() => transaction.type === 'purchase', [transaction.type]);
  const formattedAmount = useMemo(
    () => formatCurrency(parseNumericValue(transaction.amount) ?? 0),
    [transaction.amount]
  );
  const isPending = useMemo(() => transaction.status === 'pending', [transaction.status]);
  const hasComplete = typeof onComplete === 'function';
  const hasCancel = typeof onCancel === 'function';

  const bonusAmount = useMemo(() => {
    const parsedBonus = parseNumericValue(transaction.bonus_amount);
    return parsedBonus && parsedBonus > 0 ? parsedBonus : null;
  }, [transaction.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(bonusAmount) : null;
  }, [bonusAmount]);

  const amountVariant: 'positive' | 'negative' = transaction.type === 'cashout' ? 'negative' : 'positive';

  const previousBalanceValue = useMemo(
    () => parseNumericValue(transaction.previous_balance) ?? 0,
    [transaction.previous_balance]
  );
  const newBalanceValue = useMemo(
    () => parseNumericValue(transaction.new_balance) ?? 0,
    [transaction.new_balance]
  );

  const previousWinningValue = useMemo(
    () => parseNumericValue(transaction.previous_winning_balance) ?? 0,
    [transaction.previous_winning_balance]
  );
  const newWinningValue = useMemo(
    () => parseNumericValue(transaction.new_winning_balance) ?? 0,
    [transaction.new_winning_balance]
  );

  const paymentMethod = useMemo(() => transaction.payment_method ?? '', [transaction.payment_method]);
  const lowerPaymentMethod = useMemo(() => paymentMethod.toLowerCase(), [paymentMethod]);
  const isCryptoPayment = useMemo(
    () => CRYPTO_PAYMENT_METHODS.some((method) => lowerPaymentMethod.includes(method)),
    [lowerPaymentMethod]
  );

  const explicitInvoiceUrl = useMemo(() => transaction.payment_url ?? transaction.invoice_url, [transaction.payment_url, transaction.invoice_url]);
  const sanitizedInvoiceUrl = useMemo(() => typeof explicitInvoiceUrl === 'string' ? explicitInvoiceUrl.trim() : '', [explicitInvoiceUrl]);
  const invoiceUrl = useMemo(() => {
    if (sanitizedInvoiceUrl.length > 0) {
      return sanitizedInvoiceUrl;
    }
    return transaction.id
      ? `${(process.env.NEXT_PUBLIC_API_URL ?? PROJECT_DOMAIN).replace(/\/$/, '')}/api/v1/transactions/${transaction.id}/invoice/`
      : undefined;
  }, [sanitizedInvoiceUrl, transaction.id]);

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created_at), [transaction.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(transaction.updated_at), [transaction.updated_at]);

  const handleOpenInvoice = useCallback(() => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  }, [invoiceUrl]);

  const handleOpenChat = useCallback(() => {
    if (transaction.user_username) {
      const chatUrl = `/dashboard/chat?username=${encodeURIComponent(transaction.user_username)}`;
      router.push(chatUrl);
      onClose();
    }
  }, [router, transaction.user_username, onClose]);

  const handleGoToPlayerDetails = useCallback(() => {
    if (playerId) {
      router.push(`/dashboard/players/${playerId}`);
      onClose();
    } else if (transaction.user_username) {
      // Fallback: navigate to players page with search
      router.push(`/dashboard/players?search=${encodeURIComponent(transaction.user_username)}`);
      onClose();
    }
  }, [router, playerId, transaction.user_username, onClose]);

  const statusColor = transaction.status === 'completed' ? 'green' : transaction.status === 'failed' || transaction.status === 'cancelled' ? 'red' : 'yellow';
  const showActions = isPending && (hasComplete || hasCancel);
  const disableComplete = isActionLoading || !isPending;
  const disableCancel = isActionLoading || !isPending;

  return (
    <DetailsModalWrapper isOpen={isOpen} onClose={onClose} title="Transaction Details">
      <DetailsCard id={transaction.id}>
        <div className="space-y-4">
          {/* Header with Type and Status */}
          <DetailsHeader
            icon={
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isPurchase ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                )}
              </svg>
            }
            label={transaction.type.toUpperCase()}
            status={transaction.status}
            statusColor={statusColor}
          />

          {/* User Information */}
          <div className="space-y-3">
            <DetailsRow>
              <DetailsField label="User" value={transaction.user_username} />
              <DetailsField label="Email" value={transaction.user_email} />
            </DetailsRow>
            <DetailsRow>
              <DetailsField label="Operator" value={transaction.operator || '—'} />
            </DetailsRow>

            {/* Action Buttons for Player */}
            <div className="pt-2 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenChat}
                className="flex-1 font-medium text-xs h-8 flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGoToPlayerDetails}
                disabled={isLoadingPlayerId}
                className="flex-1 font-medium text-xs h-8 flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {isLoadingPlayerId ? 'Loading...' : 'Player Details'}
              </Button>
            </div>
          </div>

          {/* Payment Details */}
          {transaction.payment_details && typeof transaction.payment_details === 'object' && Object.keys(transaction.payment_details).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Payment Details</div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 space-y-2">
                {Object.entries(transaction.payment_details).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 capitalize min-w-0 flex-shrink-0">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-xs text-gray-900 dark:text-gray-100 text-right break-all min-w-0">
                      {typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Information */}
          <div className="space-y-3">
            {/* Amount */}
            <DetailsAmountBox
              amount={formattedAmount}
              bonus={formattedBonus ? `+${formattedBonus}` : undefined}
              variant={amountVariant}
            />

            {/* Balance Information */}
            <DetailsRow>
              <DetailsHighlightBox
                label="Previous Balance"
                value={formatCurrency(previousBalanceValue)}
                variant="blue"
              />
              <DetailsHighlightBox
                label="New Balance"
                value={formatCurrency(newBalanceValue)}
                variant="green"
              />
            </DetailsRow>

            {/* Winning Balance Information */}
            <DetailsRow>
              <DetailsHighlightBox
                label="Prev Winning"
                value={formatCurrency(previousWinningValue)}
                variant="purple"
              />
              <DetailsHighlightBox
                label="New Winning"
                value={formatCurrency(newWinningValue)}
                variant="green"
              />
            </DetailsRow>
          </div>

          {/* Metadata */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <DetailsRow>
              <DetailsField label="Created" value={formattedCreatedAt} />
              <DetailsField label="Updated" value={formattedUpdatedAt} />
            </DetailsRow>

            {/* Remarks/Description */}
            {transaction.description && <DetailsRemarks remarks={transaction.description} />}

            {/* View Invoice Button for Crypto Payments - Only for Purchases */}
            {isPurchase && isCryptoPayment && invoiceUrl && (
              <div className="pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="font-medium w-full text-xs h-7"
                  onClick={handleOpenInvoice}
                >
                  View Invoice
                </Button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2 sm:flex-row">
              {hasComplete && (
                <Button
                  variant="primary"
                  size="sm"
                  className={hasCancel ? 'flex-1 font-semibold' : 'w-full font-semibold'}
                  disabled={disableComplete}
                  onClick={onComplete}
                >
                  {isActionLoading ? 'Processing...' : 'Complete Transaction'}
                </Button>
              )}
              {hasCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  className={hasComplete ? 'flex-1 font-semibold' : 'w-full font-semibold'}
                  disabled={disableCancel}
                  onClick={onCancel}
                >
                  {isActionLoading ? 'Processing...' : 'Cancel Transaction'}
                </Button>
              )}
            </div>
          )}
        </div>
      </DetailsCard>

      <DetailsCloseButton onClose={onClose} />
    </DetailsModalWrapper>
  );
});

