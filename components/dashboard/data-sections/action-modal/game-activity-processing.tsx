'use client';

import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { TransactionQueue } from '@/types';
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

interface GameActivityViewModalProps {
  activity: TransactionQueue;
  isOpen: boolean;
  onClose: () => void;
}

export const GameActivityViewModal = memo(function GameActivityViewModal({
  activity,
  isOpen,
  onClose,
}: GameActivityViewModalProps) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isLoadingPlayerId, setIsLoadingPlayerId] = useState(false);

  // Fetch player ID from username when modal opens
  useEffect(() => {
    if (!isOpen || !activity.user_username || playerId) {
      return;
    }

    const fetchPlayerId = async () => {
      setIsLoadingPlayerId(true);
      try {
        // Search for player by username
        const response = await playersApi.list({ username: activity.user_username, page_size: 1 });
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
  }, [isOpen, activity.user_username, playerId]);

  // Memoize expensive computations
  const statusVariant = useMemo(() => mapStatusToVariant(activity.status), [activity.status]);
  const typeLabel = useMemo(() => mapTypeToLabel(activity.type), [activity.type]);
  const typeVariant = useMemo(() => mapTypeToVariant(activity.type), [activity.type]);
  const formattedAmount = useMemo(() => formatCurrency(activity.amount), [activity.amount]);
  
  const bonusAmount = useMemo(() => {
    const bonus = activity.bonus_amount || activity.data?.bonus_amount;
    if (!bonus) return null;
    const bonusValue = typeof bonus === 'string' || typeof bonus === 'number' 
      ? parseFloat(String(bonus)) 
      : 0;
    return bonusValue > 0 ? bonus : null;
  }, [activity.bonus_amount, activity.data?.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

  const formattedBalance = useMemo(() => {
    return formatCurrency(String(activity.data?.balance ?? '0'));
  }, [activity.data?.balance]);

  const totalAmountSent = useMemo(() => {
    const dataAmount = activity.data?.amount;
    if (dataAmount === undefined || dataAmount === null) return null;
    return formatCurrency(String(dataAmount));
  }, [activity.data?.amount]);

  // New credits and winnings from data object
  const newCreditsBalance = useMemo(() => {
    const credits = activity.data?.new_credits_balance;
    if (credits === undefined || credits === null) return null;
    const creditsValue = typeof credits === 'string' || typeof credits === 'number'
      ? parseFloat(String(credits))
      : null;
    return creditsValue !== null && !isNaN(creditsValue) ? formatCurrency(String(creditsValue)) : null;
  }, [activity.data?.new_credits_balance]);

  const newWinningBalance = useMemo(() => {
    const winnings = activity.data?.new_winning_balance;
    if (winnings === undefined || winnings === null) return null;
    const winningsValue = typeof winnings === 'string' || typeof winnings === 'number'
      ? parseFloat(String(winnings))
      : null;
    return winningsValue !== null && !isNaN(winningsValue) ? formatCurrency(String(winningsValue)) : null;
  }, [activity.data?.new_winning_balance]);

  // Website user (actual user on the platform)
  const websiteUsername = useMemo(() => {
    if (typeof activity.user_username === 'string' && activity.user_username.trim()) {
      return activity.user_username.trim();
    }
    return null;
  }, [activity.user_username]);

  // Game username (username used in the game)
  const gameUsername = useMemo(() => {
    // 1. Top-level game_username field
    if (typeof activity.game_username === 'string' && activity.game_username.trim()) {
      return activity.game_username.trim();
    }
    // 2. Username in data object (for completed transactions)
    if (activity.data && typeof activity.data === 'object' && activity.data !== null) {
      const dataUsername = activity.data.username;
      if (typeof dataUsername === 'string' && dataUsername.trim()) {
        return dataUsername.trim();
      }
    }
    return null;
  }, [activity.game_username, activity.data]);

  const formattedCreatedAt = useMemo(() => formatDate(activity.created_at), [activity.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(activity.updated_at), [activity.updated_at]);
  const showUpdatedAt = useMemo(() => activity.updated_at !== activity.created_at, [activity.updated_at, activity.created_at]);

  const statusColor = activity.status === 'completed' ? 'green' : activity.status === 'failed' ? 'red' : 'yellow';
  const amountVariant: 'positive' | 'negative' = activity.type === 'redeem_game' ? 'negative' : 'positive';

  const handleOpenChat = useCallback(() => {
    if (activity.user_username) {
      const chatUrl = `/dashboard/chat?username=${encodeURIComponent(activity.user_username)}`;
      router.push(chatUrl);
      onClose();
    }
  }, [router, activity.user_username, onClose]);

  const handleGoToPlayerDetails = useCallback(() => {
    if (playerId) {
      router.push(`/dashboard/players/${playerId}`);
      onClose();
    } else if (activity.user_username) {
      // Fallback: navigate to players page with search
      router.push(`/dashboard/players?search=${encodeURIComponent(activity.user_username)}`);
      onClose();
    }
  }, [router, playerId, activity.user_username, onClose]);

  return (
    <DetailsModalWrapper isOpen={isOpen} onClose={onClose} title="Activity Details">
      <DetailsCard id={activity.id}>
        <div className="space-y-4">
          {/* Header with Type and Status */}
          <DetailsHeader
            icon={
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {activity.type === 'recharge_game' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                ) : activity.type === 'redeem_game' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                )}
              </svg>
            }
            label={typeLabel}
            status={activity.status}
            statusColor={statusColor}
          />

          {/* Game and Game Username */}
          <DetailsRow>
            <DetailsField label="Game" value={activity.game} />
            <DetailsField label="Game Username" value={gameUsername || '—'} />
          </DetailsRow>

          {/* User Information */}
          <div className="space-y-3">
            <DetailsRow>
              <DetailsField
                label="User"
                value={websiteUsername || `User ${activity.user_id}`}
              />
              <DetailsField label="Email" value={activity.user_email || '—'} />
            </DetailsRow>
            <DetailsRow>
              <DetailsField label="Operator" value={activity.operator || '—'} />
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

          {/* Financial Information */}
          <div className="space-y-3">
            {/* Amount */}
            <DetailsAmountBox
              amount={formattedAmount}
              bonus={formattedBonus ? `+${formattedBonus}` : undefined}
              variant={amountVariant}
            />

            {/* Balance Information */}
            {(newCreditsBalance || newWinningBalance) && (
              <DetailsRow>
                {newCreditsBalance && (
                  <DetailsHighlightBox
                    label="New Credits"
                    value={newCreditsBalance}
                    variant="blue"
                  />
                )}
                {newWinningBalance && (
                  <DetailsHighlightBox
                    label="New Winnings"
                    value={newWinningBalance}
                    variant="green"
                  />
                )}
              </DetailsRow>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <DetailsRow>
              <DetailsField label="Created" value={formattedCreatedAt} />
              {showUpdatedAt && (
                <DetailsField label="Updated" value={formattedUpdatedAt} />
              )}
            </DetailsRow>

            {/* Remarks */}
            {activity.remarks && <DetailsRemarks remarks={activity.remarks} />}
          </div>
        </div>
      </DetailsCard>

      <DetailsCloseButton onClose={onClose} />
    </DetailsModalWrapper>
  );
});

// Helper functions
const mapStatusToVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'danger';
  return 'default';
};

const mapTypeToLabel = (type: string): string => {
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game' || type === 'create_game') return 'Add User';
  if (type === 'change_password' || type === 'reset_password') return 'Reset';
  return type;
};

const mapTypeToVariant = (type: string): 'success' | 'danger' | 'info' | 'default' => {
  if (type === 'recharge_game') return 'success';
  if (type === 'redeem_game') return 'danger';
  return 'info';
};
