"use client";

import { useCallback, useMemo, memo } from "react";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
} from "@/components/ui";
import type { TransactionQueue } from "@/types";
import {
  formatBalanceTransitionDisplay,
  formatCurrency,
  formatDate,
  isNonMonetaryGameActivityType,
  showsGameCreditsBalanceForActivityType,
} from "@/lib/utils/formatters";
import {
  getQueueDisplayStatus,
  getQueueStatusBadgeVariant,
} from "@/lib/utils/game-queue-display";
import { resolveGameActivityCreditsBalances } from "@/lib/utils/transaction-ledger-ws";

interface GameActivityTableProps {
  activities: TransactionQueue[];
  onViewDetails?: (activity: TransactionQueue) => void;
  showActions?: boolean;
  actionLoading?: boolean;
  compact?: boolean;
  className?: string;
}

interface GameActivityRowProps {
  activity: TransactionQueue;
  onViewDetails?: (activity: TransactionQueue) => void;
  showActions?: boolean;
  actionLoading?: boolean;
}

const mapTypeToLabel = (type: string): string => {
  if (type === "recharge_game") return "Recharge";
  if (type === "redeem_game") return "Redeem";
  if (type === "add_user_game" || type === "create_game") return "Add User";
  if (type === "change_password" || type === "reset_password") return "Reset";
  return type;
};

const mapTypeToVariant = (
  type: string,
): "success" | "danger" | "info" | "default" => {
  if (type === "recharge_game") return "info";
  if (type === "redeem_game") return "danger";
  return "info";
};

const getStatusVariant = getQueueStatusBadgeVariant;

function GameActivityRow({
  activity,
  onViewDetails,
  showActions = true,
  actionLoading = false,
}: GameActivityRowProps) {
  const displayStatus = getQueueDisplayStatus(activity.status, activity.remarks);
  const statusVariant = getStatusVariant(displayStatus);
  const typeLabel = mapTypeToLabel(activity.type);
  const typeVariant = mapTypeToVariant(activity.type);
  const formattedAmount = formatCurrency(activity.amount || "0");

  const bonusAmount = useMemo(() => {
    const bonus = activity.bonus_amount || activity.data?.bonus_amount;
    if (!bonus) return null;
    const bonusValue =
      typeof bonus === "string" || typeof bonus === "number"
        ? parseFloat(String(bonus))
        : 0;
    return bonusValue > 0 ? bonus : null;
  }, [activity.bonus_amount, activity.data?.bonus_amount]);

  const formattedBonus = bonusAmount
    ? formatCurrency(String(bonusAmount))
    : null;

  const shouldShowDash = useMemo(() => {
    const amountValue = parseFloat(activity.amount || "0");
    const isZeroAmount = amountValue === 0 || isNaN(amountValue);
    const typeStr = String(activity.type);
    const isNonMonetaryType =
      typeStr === "create_game" ||
      typeStr === "reset_password" ||
      typeStr === "change_password" ||
      typeStr === "add_user_game";
    return isZeroAmount && isNonMonetaryType;
  }, [activity.amount, activity.type]);

  const amountColorClass =
    activity.type === "redeem_game"
      ? "text-orange-600 dark:text-orange-400"
      : activity.type === "recharge_game"
        ? "text-purple-600 dark:text-purple-400"
        : "text-green-600 dark:text-green-400";
  const bonusColorClass = amountColorClass;

  const creditsBalances = useMemo(
    () => resolveGameActivityCreditsBalances(activity),
    [activity.type, activity.status, activity.amount, activity.data],
  );

  const previousCreditsNum = creditsBalances.previous ?? 0;
  const newCreditsNum = creditsBalances.new ?? 0;

  const formattedPreviousCredits =
    creditsBalances.previous != null
      ? formatCurrency(String(creditsBalances.previous))
      : null;

  const formattedNewCredits =
    creditsBalances.new != null
      ? formatCurrency(String(creditsBalances.new))
      : null;

  const creditsChanged = previousCreditsNum !== newCreditsNum;

  const creditsColorClass = creditsChanged
    ? "text-indigo-600 dark:text-indigo-400 font-semibold"
    : "text-gray-600 dark:text-gray-400";

  const zeroCurrency = formatCurrency("0");

  const creditsDisplayText = useMemo(
    () =>
      formatBalanceTransitionDisplay(
        formattedPreviousCredits,
        formattedNewCredits,
        zeroCurrency,
      ),
    [formattedPreviousCredits, formattedNewCredits, zeroCurrency],
  );

  const websiteUsername =
    typeof activity.user_username === "string" && activity.user_username.trim()
      ? activity.user_username.trim()
      : null;

  const websiteEmail =
    typeof activity.user_email === "string" && activity.user_email.trim()
      ? activity.user_email.trim()
      : null;

  const gameName = activity.game || "Unknown Game";
  const gameUsername =
    activity.game_username ||
    (activity.data &&
    typeof activity.data === "object" &&
    activity.data !== null &&
    typeof activity.data.username === "string" &&
    activity.data.username.trim()
      ? activity.data.username.trim()
      : null);

  // Check if this is an "Add user" action - should show hyphen for game username
  const isAddUserAction = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === "add_user_game" || typeStr === "create_game";
  }, [activity.type]);

  const userInitial = websiteUsername
    ? websiteUsername.charAt(0).toUpperCase()
    : activity.user_id
      ? String(activity.user_id).charAt(0)
      : "—";

  const formattedCreatedAt = formatDate(activity.created_at);
  const formattedUpdatedAt = formatDate(activity.updated_at);
  const showUpdatedAt = activity.updated_at !== activity.created_at;

  const handleOpenDetails = useCallback(() => {
    onViewDetails?.(activity);
  }, [activity, onViewDetails]);

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenDetails}
            className="flex-shrink-0 touch-manipulation"
            title="View activity details"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
              {userInitial}
            </div>
          </button>
          <div>
            <button
              type="button"
              onClick={handleOpenDetails}
              className="text-left touch-manipulation"
              title="View activity details"
            >
              <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {websiteUsername || `User ${activity.user_id}`}
              </div>
            </button>
            {websiteEmail && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {websiteEmail}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={typeVariant} className="capitalize">
          {typeLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="font-medium">{gameName}</div>
      </TableCell>
      <TableCell>
        {gameUsername ? (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {gameUsername}
          </div>
        ) : isAddUserAction ? (
          <div className="font-medium text-gray-500 dark:text-gray-400 italic text-sm">
            New user added
          </div>
        ) : activity.status === "cancelled" ? (
          <Badge variant="default" className="text-xs">
            Cancelled
          </Badge>
        ) : (
          <div className="font-medium text-gray-900 dark:text-gray-100">—</div>
        )}
      </TableCell>
      <TableCell>
        <div
          className={`text-sm font-bold ${shouldShowDash ? "" : amountColorClass}`}
        >
          {shouldShowDash ? "—" : formattedAmount}
          {!shouldShowDash && formattedBonus && (
            <div className={`text-xs font-semibold ${bonusColorClass} mt-0.5`}>
              +{formattedBonus} bonus
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className={`text-xs ${creditsColorClass}`}>
          {showsGameCreditsBalanceForActivityType(String(activity.type))
            ? creditsDisplayText
            : "—"}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {displayStatus}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>{formattedCreatedAt}</div>
          {showUpdatedAt && <div>{formattedUpdatedAt}</div>}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function GameActivityTable({
  activities,
  onViewDetails,
  showActions = true,
  actionLoading = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  compact = false,
  className = "",
}: GameActivityTableProps) {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return null;
  }

  const hasNoBorder =
    className.includes("border-0") || className.includes("no-border");
  const containerClasses = hasNoBorder
    ? `bg-transparent overflow-hidden ${className}`
    : `bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`;

  return (
    <div className={containerClasses}>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
        {activities.map((activity: TransactionQueue) => (
          <GameActivityCard
            key={activity.id}
            activity={activity}
            onViewDetails={onViewDetails}
            showActions={showActions}
            actionLoading={actionLoading}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Game Username</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity: TransactionQueue) => (
              <GameActivityRow
                key={activity.id}
                activity={activity}
                onViewDetails={onViewDetails}
                showActions={showActions}
                actionLoading={actionLoading}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Game Activity Card Component for Mobile
interface GameActivityCardProps {
  activity: TransactionQueue;
  onViewDetails?: (activity: TransactionQueue) => void;
  showActions?: boolean;
  actionLoading?: boolean;
}

const GameActivityCard = memo(
  function GameActivityCard({
    activity,
    onViewDetails,
    showActions = true,
    actionLoading = false,
  }: GameActivityCardProps) {
    const displayStatus = getQueueDisplayStatus(activity.status, activity.remarks);
    const statusVariant = getStatusVariant(displayStatus);
    const typeLabel = mapTypeToLabel(activity.type);
    const typeVariant = mapTypeToVariant(activity.type);
    const formattedAmount = formatCurrency(activity.amount || "0");

    const bonusAmount = useMemo(() => {
      const bonus = activity.bonus_amount || activity.data?.bonus_amount;
      if (!bonus) return null;
      const bonusValue =
        typeof bonus === "string" || typeof bonus === "number"
          ? parseFloat(String(bonus))
          : 0;
      return bonusValue > 0 ? bonus : null;
    }, [activity.bonus_amount, activity.data?.bonus_amount]);

    const formattedBonus = bonusAmount
      ? formatCurrency(String(bonusAmount))
      : null;
    const amountColorClass =
      activity.type === "redeem_game"
        ? "text-orange-600 dark:text-orange-400"
        : activity.type === "recharge_game"
          ? "text-purple-600 dark:text-purple-400"
          : "text-green-600 dark:text-green-400";
    const bonusColorClass = amountColorClass;

    const creditsBalances = useMemo(
      () => resolveGameActivityCreditsBalances(activity),
      [activity.type, activity.status, activity.amount, activity.data],
    );

    const previousCreditsNum = creditsBalances.previous ?? 0;
    const newCreditsNum = creditsBalances.new ?? 0;

    const formattedPreviousCredits =
      creditsBalances.previous != null
        ? formatCurrency(String(creditsBalances.previous))
        : null;

    const formattedNewCredits =
      creditsBalances.new != null
        ? formatCurrency(String(creditsBalances.new))
        : null;

    const creditsChanged = previousCreditsNum !== newCreditsNum;

    const creditsColorClass = creditsChanged
      ? "text-indigo-600 dark:text-indigo-400 font-semibold"
      : "text-gray-600 dark:text-gray-400";

    const zeroCurrency = formatCurrency("0");

    const websiteUsername = useMemo(() => {
      if (
        typeof activity.user_username === "string" &&
        activity.user_username.trim()
      ) {
        return activity.user_username.trim();
      }
      return null;
    }, [activity.user_username]);

    const websiteEmail = useMemo(() => {
      if (
        typeof activity.user_email === "string" &&
        activity.user_email.trim()
      ) {
        return activity.user_email.trim();
      }
      return null;
    }, [activity.user_email]);

    const gameUsername = useMemo(() => {
      if (
        typeof activity.game_username === "string" &&
        activity.game_username.trim()
      ) {
        return activity.game_username.trim();
      }
      if (
        activity.data &&
        typeof activity.data === "object" &&
        activity.data !== null
      ) {
        const dataUsername = activity.data.username;
        if (typeof dataUsername === "string" && dataUsername.trim()) {
          return dataUsername.trim();
        }
      }
      return null;
    }, [activity.game_username, activity.data]);

    const userInitial = useMemo(() => {
      if (websiteUsername) {
        return websiteUsername.charAt(0).toUpperCase();
      }
      return activity.user_id ? String(activity.user_id).charAt(0) : "—";
    }, [websiteUsername, activity.user_id]);

    const formattedCreatedAt = useMemo(
      () => formatDate(activity.created_at),
      [activity.created_at],
    );

    const shouldShowDash = useMemo(() => {
      const amountValue = parseFloat(activity.amount || "0");
      const isZeroAmount = amountValue === 0 || isNaN(amountValue);
      const typeStr = String(activity.type);
      const isNonMonetaryType =
        typeStr === "create_game" ||
        typeStr === "reset_password" ||
        typeStr === "change_password" ||
        typeStr === "add_user_game";
      return isZeroAmount && isNonMonetaryType;
    }, [activity.amount, activity.type]);

    const amountColorClassFinal = useMemo(() => {
      if (shouldShowDash) return "";
      return amountColorClass;
    }, [shouldShowDash, amountColorClass]);

    const bonusColorClassFinal = useMemo(() => {
      if (shouldShowDash) return "";
      return bonusColorClass;
    }, [shouldShowDash, bonusColorClass]);

    const handleOpenDetails = useCallback(() => {
      onViewDetails?.(activity);
    }, [activity, onViewDetails]);

    return (
      <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900">
        {/* Top Section: User + status */}
        <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={handleOpenDetails}
              className="flex-shrink-0 touch-manipulation"
              title="View activity details"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-85">
                {userInitial}
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={handleOpenDetails}
                    className="text-left w-full touch-manipulation"
                    title="View activity details"
                  >
                    <h3 className="truncate text-sm font-semibold leading-5 text-gray-900 transition-colors hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400">
                      {websiteUsername || `User ${activity.user_id}`}
                    </h3>
                  </button>
                  {websiteEmail && (
                    <p className="mt-0.5 truncate text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                      {websiteEmail}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge
                  variant={statusVariant}
                  className="h-5 px-2 text-[10px] capitalize"
                >
                  {displayStatus}
                </Badge>
                <Badge
                  variant={typeVariant}
                  className="h-5 px-2 text-[10px] capitalize"
                >
                  {typeLabel}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Key Info */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="rounded-md bg-gray-50/80 px-2.5 py-2 dark:bg-gray-800/60">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Game
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                  {activity.game || "Unknown Game"}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Username
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                  {gameUsername || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Section (omit on mobile cards for add-user / password-reset) */}
        {!isNonMonetaryGameActivityType(activity.type) && (
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Amount
              </span>
              <div className="text-right">
                <div
                  className={`text-sm font-semibold ${amountColorClassFinal}`}
                >
                  {shouldShowDash ? "—" : formattedAmount}
                </div>
                {!shouldShowDash && formattedBonus && (
                  <div
                    className={`mt-0.5 text-[11px] font-medium ${bonusColorClassFinal}`}
                  >
                    +{formattedBonus} bonus
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Balance Section (recharge / redeem only) */}
        {showsGameCreditsBalanceForActivityType(activity.type) &&
          (formattedPreviousCredits || formattedNewCredits) && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Balance
                  </div>
                  <div
                    className={`flex items-center gap-1 text-[11px] ${creditsColorClass}`}
                  >
                    <span className="truncate">
                      {formattedPreviousCredits || zeroCurrency}
                    </span>
                    <svg
                      className="h-3 w-3 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    <span className="font-semibold truncate">
                      {formattedNewCredits || zeroCurrency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Bottom Section: Date + action */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formattedCreatedAt}</span>
          </div>
          <button
            type="button"
            onClick={handleOpenDetails}
            className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Details
          </button>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.activity.id === nextProps.activity.id &&
      prevProps.activity.status === nextProps.activity.status &&
      prevProps.activity.type === nextProps.activity.type &&
      prevProps.activity.amount === nextProps.activity.amount &&
      prevProps.activity.bonus_amount === nextProps.activity.bonus_amount &&
      prevProps.onViewDetails === nextProps.onViewDetails &&
      prevProps.showActions === nextProps.showActions &&
      prevProps.actionLoading === nextProps.actionLoading
    );
  },
);
