'use client';

import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import {
  formatCurrency,
  formatDate,
  formatPaymentMethod,
  getPaymentDetailsForDisplay,
  isCryptoPaymentMethod,
} from '@/lib/utils/formatters';
import type { Transaction } from '@/types';
import { playersApi } from '@/lib/api';
import { mergeTransactionTextSnapshot } from '@/lib/utils/transaction-ws-merge';
import {
  getRouletteTransactionDetailEntries,
  getVerificationTransactionDetailEntries,
  isRouletteTransaction,
  isVerificationTransaction,
  parseRouletteTimelineSpins,
  resolvePlayerTimelineAmountDisplay,
  resolveVerificationTimelineOutcome,
  type PlayerTimelineItem,
} from '@/lib/utils/player-timeline';
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

/** Dynamic "Send to Provider" button (e.g. Send to Binpay, Send to Apex) */
export interface SendToProviderButton {
  label: string;
  action: string;
}

/** Previous/Next controls for moving through the current result list without closing the drawer. */
export interface TransactionDetailsNavigation {
  currentPosition: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  isLoading?: boolean;
}

interface TransactionDetailsModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  /** When the open transaction is part of a list (e.g. processing table), show prev/next controls. */
  navigation?: TransactionDetailsNavigation;
  onComplete?: () => void;
  onCancel?: () => void;
  /** @deprecated Use sendToProviderButtons + onSendToProvider instead */
  onSendToBinpay?: () => void;
  /** @deprecated Use sendToProviderButtons + onSendToProvider instead */
  onSendToTierlock?: () => void;
  /** Dynamic send-to-provider buttons from payment-methods subcategories (e.g. Send to Binpay, Send to Apex) */
  sendToProviderButtons?: SendToProviderButton[];
  /** Handler when a send-to-provider button is clicked; receives the action string (e.g. send_to_binpay, send_to_apex) */
  onSendToProvider?: (action: string) => void;
  isActionLoading?: boolean;
}

export const TransactionDetailsModal = memo(function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  navigation,
  onComplete,
  onCancel,
  onSendToBinpay,
  onSendToTierlock,
  sendToProviderButtons,
  onSendToProvider,
  isActionLoading = false,
}: TransactionDetailsModalProps) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isLoadingPlayerId, setIsLoadingPlayerId] = useState(false);

  useEffect(() => {
    setPlayerId(null);
  }, [transaction.id]);

  // Fetch player ID from username when modal opens or transaction changes
  useEffect(() => {
    if (!isOpen || !transaction.user_username) {
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
  }, [isOpen, transaction.user_username, transaction.id]);

  useEffect(() => {
    if (!isOpen || !navigation || navigation.total <= 1) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (navigation.isLoading) {
        return;
      }
      if (e.key === 'ArrowLeft' && navigation.currentPosition > 1) {
        e.preventDefault();
        navigation.onPrevious();
      } else if (e.key === 'ArrowRight' && navigation.currentPosition < navigation.total) {
        e.preventDefault();
        navigation.onNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, navigation]);

  // Memoize expensive computations
  const isPurchase = useMemo(() => transaction.type === 'purchase', [transaction.type]);
  const isRoulette = useMemo(() => isRouletteTransaction(transaction), [transaction]);
  const isVerification = useMemo(
    () => isVerificationTransaction(transaction),
    [transaction],
  );

  const rouletteDetailEntries = useMemo(
    () => getRouletteTransactionDetailEntries(transaction),
    [transaction],
  );

  const verificationDetailEntries = useMemo(
    () => getVerificationTransactionDetailEntries(transaction),
    [transaction],
  );

  const timelineAmountPreview = useMemo(() => {
    if (!isRoulette && !isVerification) return null;
    const spins = parseRouletteTimelineSpins({
      roulette_spins:
        transaction.payment_details &&
        typeof transaction.payment_details === 'object'
          ? transaction.payment_details.roulette_spins
          : undefined,
    });
    const pd =
      transaction.payment_details && typeof transaction.payment_details === 'object'
        ? (transaction.payment_details as Record<string, unknown>)
        : {};
    const preview: PlayerTimelineItem = {
      id: transaction.id,
      kind: isVerification ? 'verification' : 'transaction',
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      bonus_amount: transaction.bonus_amount,
      roulette_spins: spins,
      provider: transaction.provider ?? (isRoulette ? 'roulette' : undefined),
      payment_method: transaction.payment_method,
      reason: transaction.reason ?? undefined,
      reason_display: transaction.reason_display ?? undefined,
      created_at: transaction.created_at,
      raw: {
        verification: pd.verification,
        payload: pd.payload,
        identity_verification_status: pd.identity_verification_status,
        reason: transaction.reason,
      },
    };
    return resolvePlayerTimelineAmountDisplay(preview);
  }, [isRoulette, isVerification, transaction]);

  const verificationOutcome = useMemo(() => {
    if (!isVerification) return null;
    const pd =
      transaction.payment_details && typeof transaction.payment_details === 'object'
        ? (transaction.payment_details as Record<string, unknown>)
        : {};
    return resolveVerificationTimelineOutcome({
      reason: transaction.reason ?? undefined,
      status: transaction.status,
      raw: {
        verification: pd.verification,
        payload: pd.payload,
        identity_verification_status: pd.identity_verification_status,
        reason: transaction.reason,
      },
    });
  }, [isVerification, transaction]);

  const formattedAmount = useMemo(() => {
    if (timelineAmountPreview && !timelineAmountPreview.showAsCurrency) {
      return timelineAmountPreview.primaryText;
    }
    return formatCurrency(parseNumericValue(transaction.amount) ?? 0);
  }, [transaction.amount, timelineAmountPreview]);
  const isPending = useMemo(() => transaction.status === 'pending', [transaction.status]);
  const hasComplete = typeof onComplete === 'function';
  const hasCancel = typeof onCancel === 'function';
  const hasDynamicSendButtons = Boolean(
    sendToProviderButtons?.length && typeof onSendToProvider === 'function'
  );
  const hasSendToBinpay = typeof onSendToBinpay === 'function';
  const hasSendToTierlock = typeof onSendToTierlock === 'function';
  const hasSendToProvider = hasDynamicSendButtons || hasSendToBinpay || hasSendToTierlock;

  const bonusAmount = useMemo(() => {
    const parsedBonus = parseNumericValue(transaction.bonus_amount);
    return parsedBonus && parsedBonus > 0 ? parsedBonus : null;
  }, [transaction.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(bonusAmount) : null;
  }, [bonusAmount]);

  const rouletteSpinsMeta = useMemo(() => {
    const pd = transaction.payment_details;
    if (!pd || typeof pd !== 'object') return undefined;
    return parseRouletteTimelineSpins(pd as Record<string, unknown>);
  }, [transaction.payment_details]);

  const showSpinBalanceInModal = Boolean(
    isRoulette &&
      rouletteSpinsMeta &&
      (rouletteSpinsMeta.previous_balance != null || rouletteSpinsMeta.new_balance != null) &&
      !((parseNumericValue(transaction.amount) ?? 0) > 0 || (bonusAmount ?? 0) > 0),
  );

  const amountVariant: 'positive' | 'negative' = transaction.type === 'cashout' ? 'negative' : 'positive';

  const previousBalanceValue = useMemo(
    () => parseNumericValue(transaction.previous_balance) ?? 0,
    [transaction.previous_balance]
  );
  const newBalanceValue = useMemo(
    () => parseNumericValue(transaction.new_balance) ?? 0,
    [transaction.new_balance]
  );

  const paymentMethod = useMemo(() => transaction.payment_method ?? '', [transaction.payment_method]);
  const isCryptoPayment = useMemo(() => isCryptoPaymentMethod(paymentMethod), [paymentMethod]);

  const explicitInvoiceUrl = useMemo(() => transaction.payment_url ?? transaction.invoice_url, [transaction.payment_url, transaction.invoice_url]);
  const sanitizedInvoiceUrl = useMemo(() => typeof explicitInvoiceUrl === 'string' ? explicitInvoiceUrl.trim() : '', [explicitInvoiceUrl]);
  const invoiceUrl = useMemo(
    () => (sanitizedInvoiceUrl.length > 0 ? sanitizedInvoiceUrl : undefined),
    [sanitizedInvoiceUrl],
  );

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created_at), [transaction.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(transaction.updated_at), [transaction.updated_at]);

  const remarksForDisplay = useMemo(
    () => mergeTransactionTextSnapshot(transaction.description, transaction.remarks),
    [transaction.description, transaction.remarks],
  );

  const handleOpenInvoice = useCallback(() => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  }, [invoiceUrl]);

  const handleOpenChat = useCallback(() => {
    if (playerId) {
      router.push(`/dashboard/chat?playerId=${playerId}`);
      onClose();
      return;
    }
    if (transaction.user_username) {
      router.push(
        `/dashboard/chat?username=${encodeURIComponent(transaction.user_username)}`,
      );
      onClose();
    }
  }, [router, playerId, transaction.user_username, onClose]);

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

  const statusColor =
    verificationOutcome === 'approved'
      ? 'green'
      : verificationOutcome === 'rejected'
        ? 'red'
        : verificationOutcome === 'pending'
          ? 'yellow'
          : transaction.status === 'completed'
            ? 'green'
            : transaction.status === 'failed' || transaction.status === 'cancelled'
              ? 'red'
              : 'yellow';
  const headerStatusLabel =
    verificationOutcome && verificationOutcome !== 'unknown'
      ? verificationOutcome
      : transaction.status;
  const headerTypeLabel = isVerification
    ? 'IDENTITY VERIFICATION'
    : transaction.type.toUpperCase();
  const showActions = isPending && (hasComplete || hasCancel || hasSendToProvider);
  const disableComplete = isActionLoading || !isPending;
  const disableCancel = isActionLoading || !isPending;
  const disableSendToProvider = isActionLoading || !isPending;

  const showNavigation =
    navigation != null && navigation.total > 1 && navigation.currentPosition >= 1 && navigation.currentPosition <= navigation.total;

  return (
    <DetailsModalWrapper isOpen={isOpen} onClose={onClose} title="Transaction Details">
      {showNavigation && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1 text-xs shrink-0"
            disabled={navigation.isLoading || navigation.currentPosition <= 1}
            onClick={navigation.onPrevious}
            aria-label="Previous transaction"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums text-center min-w-0">
            {navigation.isLoading ? 'Loading...' : `${navigation.currentPosition} / ${navigation.total}`}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1 text-xs shrink-0"
            disabled={navigation.isLoading || navigation.currentPosition >= navigation.total}
            onClick={navigation.onNext}
            aria-label="Next transaction"
          >
            Next
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}
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
            label={headerTypeLabel}
            status={headerStatusLabel}
            statusColor={statusColor}
          />

          {/* User Information */}
          <div className="space-y-3">
            <DetailsRow>
              <DetailsField label="User" value={transaction.user_username} />
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

          {rouletteDetailEntries.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Prize wheel
              </div>
              <div className="bg-violet-50 dark:bg-violet-950/30 rounded-md p-3 space-y-2">
                {rouletteDetailEntries.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 min-w-0 flex-shrink-0">
                      {label}:
                    </span>
                    <span className="text-xs text-gray-900 dark:text-gray-100 text-right break-all min-w-0">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {verificationDetailEntries.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Identity verification
              </div>
              <div
                className={`rounded-md p-3 space-y-2 ${
                  verificationOutcome === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30'
                    : verificationOutcome === 'rejected'
                      ? 'bg-red-50 dark:bg-red-950/30'
                      : 'bg-amber-50 dark:bg-amber-950/30'
                }`}
              >
                {verificationDetailEntries.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 min-w-0 flex-shrink-0">
                      {label}:
                    </span>
                    <span className="text-xs text-gray-900 dark:text-gray-100 text-right break-all min-w-0">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Details (provider-specific: email, account name, cashtag, etc.) */}
          {(() => {
            const entries = getPaymentDetailsForDisplay(transaction);
            return entries.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Payment Details</div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 space-y-2">
                  {entries.map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 min-w-0 flex-shrink-0">
                        {label}:
                      </span>
                      <span className="text-xs text-gray-900 dark:text-gray-100 text-right break-all min-w-0">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

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
              {showSpinBalanceInModal && rouletteSpinsMeta ? (
                <>
                  <DetailsHighlightBox
                    label="Spin balance (before)"
                    value={String(rouletteSpinsMeta.previous_balance ?? 0)}
                    variant="blue"
                  />
                  <DetailsHighlightBox
                    label="Spin balance (after)"
                    value={String(rouletteSpinsMeta.new_balance ?? 0)}
                    variant="green"
                  />
                </>
              ) : (
                <>
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
                </>
              )}
            </DetailsRow>
          </div>

          {/* Metadata */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <DetailsRow>
              <DetailsField label="Created" value={formattedCreatedAt} />
              <DetailsField label="Updated" value={formattedUpdatedAt} />
            </DetailsRow>

            {/* Remarks: API `description` (and optional `remarks`) — merged so list + WS snapshots stay aligned */}
            {remarksForDisplay.trim().length > 0 ? <DetailsRemarks remarks={remarksForDisplay} /> : null}

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
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-row flex-wrap gap-2">
                {hasComplete && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 min-w-0 font-semibold"
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
                    className="flex-1 min-w-0 font-semibold"
                    disabled={disableCancel}
                    onClick={onCancel}
                  >
                    {isActionLoading ? 'Processing...' : 'Cancel Transaction'}
                  </Button>
                )}
                {hasDynamicSendButtons &&
                  sendToProviderButtons!.map((btn) => (
                    <Button
                      key={btn.action}
                      variant="secondary"
                      size="sm"
                      className="flex-1 min-w-0 font-semibold"
                      disabled={disableSendToProvider}
                      onClick={() => onSendToProvider!(btn.action)}
                    >
                      {isActionLoading ? 'Processing...' : btn.label}
                    </Button>
                  ))}
                {!hasDynamicSendButtons && hasSendToBinpay && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 min-w-0 font-semibold"
                    disabled={disableSendToProvider}
                    onClick={onSendToBinpay}
                  >
                    {isActionLoading ? 'Processing...' : 'Send to Binpay'}
                  </Button>
                )}
                {!hasDynamicSendButtons && hasSendToTierlock && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 min-w-0 font-semibold"
                    disabled={disableSendToProvider}
                    onClick={onSendToTierlock}
                  >
                    {isActionLoading ? 'Processing...' : 'Send to Tierlock'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DetailsCard>

      <DetailsCloseButton onClose={onClose} />
    </DetailsModalWrapper>
  );
});

