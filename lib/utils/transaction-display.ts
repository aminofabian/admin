const AMOUNT_GREEN = "text-green-600 dark:text-green-400";
const AMOUNT_RED = "text-red-600 dark:text-red-400";
const AMOUNT_PURPLE = "text-purple-600 dark:text-purple-400";
const AMOUNT_ORANGE = "text-orange-600 dark:text-orange-400";
const AMOUNT_GREY = "text-gray-500 dark:text-gray-400";

/**
 * History / list payloads may expose the row kind as `type` and/or `txn_type`.
 * Prefer `type` when present; otherwise use `txn_type`. Normalized to lowercase.
 */
export function getTransactionKind(transaction: {
  type?: string | null;
  txn_type?: string | null;
}): string {
  const primary = String(transaction.type ?? "").trim();
  if (primary !== "") return primary.toLowerCase();
  return String(transaction.txn_type ?? "")
    .trim()
    .toLowerCase();
}

export function getTransactionAmountColorClass(
  type: string | undefined | null,
  amount: string | number | undefined | null,
  status?: string | null,
): string {
  const s = (status || "").toLowerCase();
  if (s === "expired" || s === "failed") return AMOUNT_GREY;

  const t = (type || "").toLowerCase();
  if (t === "add" || t === "purchase") return AMOUNT_GREEN;
  if (t === "deduct" || t === "cashout" || t === "withdraw") return AMOUNT_RED;
  if (t === "recharge" || t === "recharge_game") return AMOUNT_PURPLE;
  if (t === "redeem" || t === "redeem_game") return AMOUNT_ORANGE;
  const amountValue = parseFloat(String(amount ?? 0));
  return amountValue >= 0 ? AMOUNT_GREEN : AMOUNT_RED;
}

export function getTransactionTypeBadgeStyle(
  type: string | undefined | null,
  paymentMethod: string | undefined | null,
): { variant: "success" | "danger" | "default"; isTransfer: boolean } {
  const t = (type || "").toLowerCase();
  const method = (paymentMethod || "").toLowerCase();
  const isTransfer = t.includes("transfer") || method.includes("transfer");
  if (isTransfer) return { variant: "default", isTransfer: true };
  if (
    t === "add" ||
    t === "purchase" ||
    t === "recharge" ||
    t === "recharge_game"
  )
    return { variant: "success", isTransfer: false };
  if (
    t === "deduct" ||
    t === "cashout" ||
    t === "withdraw" ||
    t === "redeem" ||
    t === "redeem_game"
  )
    return { variant: "danger", isTransfer: false };
  return { variant: "danger", isTransfer: false };
}
