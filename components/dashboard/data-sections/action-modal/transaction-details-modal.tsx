'use client';

import { memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { Transaction } from '@/types';
import { PROJECT_DOMAIN } from '@/lib/constants/api';
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

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created), [transaction.created]);
  const formattedUpdatedAt = useMemo(() => formatDate(transaction.updated), [transaction.updated]);

  const handleOpenInvoice = useCallback(() => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  }, [invoiceUrl]);

  const statusColor = transaction.status === 'completed' ? 'green' : transaction.status === 'failed' || transaction.status === 'cancelled' ? 'red' : 'yellow';
  const showActions = isPending && (hasComplete || hasCancel);
  const disableComplete = isActionLoading || !isPending;
  const disableCancel = isActionLoading || !isPending;

  return (
    <DetailsModalWrapper isOpen={isOpen} onClose={onClose} title="Transaction Details">
      <DetailsCard id={transaction.id}>
        <div className="space-y-2">
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

          {/* User and Email */}
          <DetailsRow>
            <DetailsField label="User" value={transaction.user_username} />
            <DetailsField label="Email" value={transaction.user_email} />
          </DetailsRow>

          {/* Payment Method and Operator */}
          <DetailsRow>
            <DetailsField label="Payment Method" value={paymentMethod} />
            <DetailsField label="Operator" value={transaction.operator || '—'} />
          </DetailsRow>

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

          {/* Amount */}
          <DetailsAmountBox
            amount={formattedAmount}
            bonus={formattedBonus ? `+${formattedBonus}` : undefined}
            variant={amountVariant}
          />

          {/* Dates */}
          <DetailsRow>
            <DetailsField label="Created" value={formattedCreatedAt} />
            <DetailsField label="Updated" value={formattedUpdatedAt} />
          </DetailsRow>

          {/* View Invoice Button for Crypto Payments */}
          {isCryptoPayment && invoiceUrl && (
            <div className="pt-2 border-t border-border">
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

          {/* Remarks/Description */}
          {transaction.description && <DetailsRemarks remarks={transaction.description} />}

          {showActions && (
            <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2 sm:flex-row">
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

