'use client';

import { memo, useCallback, useMemo } from 'react';
import { Badge, Button, Modal } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { Transaction } from '@/types';
import { PROJECT_DOMAIN } from '@/lib/constants/api';

const CRYPTO_PAYMENT_METHODS = ['bitcoin', 'litecoin', 'bitcoin_lightning', 'crypto'];

interface TransactionDetailsModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
}

function mapStatusToVariant(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  return 'default';
}

export const TransactionDetailsModal = memo(function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
}: TransactionDetailsModalProps) {
  // Memoize expensive computations
  const statusVariant = useMemo(() => mapStatusToVariant(transaction.status), [transaction.status]);
  const isPurchase = useMemo(() => transaction.type === 'purchase', [transaction.type]);
  const typeVariant = useMemo(() => isPurchase ? 'success' : 'danger', [isPurchase]);
  const formattedAmount = useMemo(() => formatCurrency(transaction.amount), [transaction.amount]);
  
  const bonusAmount = useMemo(() => {
    const bonus = parseFloat(transaction.bonus_amount || '0');
    return bonus > 0 ? bonus : null;
  }, [transaction.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

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

  const operator = useMemo(() => {
    return transaction.operator?.toLowerCase() === 'company' ? 'admin' : transaction.operator;
  }, [transaction.operator]);

  const formattedCreatedAt = useMemo(() => formatDate(transaction.created), [transaction.created]);
  const formattedUpdatedAt = useMemo(() => formatDate(transaction.updated), [transaction.updated]);

  const handleOpenInvoice = useCallback(() => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  }, [invoiceUrl]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Section - Status and Type */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
          <div className="flex items-center gap-3">
            <Badge variant={typeVariant} className="text-sm px-3 py-1 uppercase">
              {transaction.type}
            </Badge>
            <Badge variant={statusVariant} className="text-sm px-3 py-1 capitalize">
              {transaction.status}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{formattedAmount}</div>
            {formattedBonus && (
              <div className="text-sm font-semibold text-green-600">
                +{formattedBonus} bonus
              </div>
            )}
          </div>
        </div>

        {/* Transaction ID and Operator */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transaction ID...</label>
            <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
              {transaction.id}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operator</label>
            <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
              {operator || '—'}
            </div>
          </div>
        </div>

        {/* Balance Section */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Previous Balance</label>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{formatCurrency(transaction.previous_balance)}</div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">New Balance</label>
            <div className="text-lg font-bold text-green-900 dark:text-green-100">{formatCurrency(transaction.new_balance)}</div>
          </div>
        </div>

        {/* User Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">User Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Username</label>
              <div className="text-sm font-semibold text-foreground">{transaction.user_username}</div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Email</label>
              <div className="text-sm text-foreground">{transaction.user_email}</div>
            </div>
          </div>
        </div>

        {/* Payment & Operator Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Payment & Operator</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Payment Method</label>
              <Badge variant="info" className="text-xs">
                {paymentMethod}
              </Badge>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Operator</label>
              <div className="text-sm font-semibold text-foreground">
                {operator || '—'}
              </div>
            </div>
          </div>
          {/* View Invoice Button for Crypto Payments */}
          {isCryptoPayment && invoiceUrl && (
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="font-medium w-full"
                onClick={handleOpenInvoice}
              >
                View Invoice
              </Button>
            </div>
          )}
        </div>

        {/* Transaction Details */}
        {transaction.description && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Transaction Details</h3>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Description</label>
              <div className="text-sm text-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/30">
                {transaction.description}
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">TIMESTAMPS</h3>
          <div className="border-b border-gray-300 dark:border-gray-600"></div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400">Created</label>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{formattedCreatedAt}</div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400">Updated</label>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{formattedUpdatedAt}</div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        {transaction.remarks && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">REMARKS</h3>
            <div className="border-b border-gray-300 dark:border-gray-600"></div>
            <div className="bg-yellow-50/80 dark:bg-yellow-50/30 px-4 py-3 rounded-lg">
              <div className="text-sm text-gray-800 dark:text-gray-800">{transaction.remarks}</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});

