import type { ChatMessage } from '@/types';
import {
  isAutoMessage,
  isKycVerificationMessage,
  isPrizeWheelMessage,
  isPurchaseNotification,
  parseTransactionMessage,
} from './message-helpers';

/**
 * How a chat message should be presented.
 *
 * The four classifiers were each invoked for every row on every render — in the
 * parent list, again inside the bubble, and once more against the *previous*
 * message to decide whether to draw an avatar. With ~19 HTML parses per call
 * that made scrolling the transcript O(n) parses per frame.
 *
 * `classifyMessage` runs the whole set once per message and memoises it against
 * the message object, so the repeat lookups are free. A `WeakMap` is used
 * deliberately: entries disappear with their message, so a long session cannot
 * leak, and if a caller does rebuild message objects the cache simply misses
 * rather than serving something stale.
 */
export interface MessageClassification {
  isAuto: boolean;
  isPurchase: boolean;
  isPrizeWheel: boolean;
  isKyc: boolean;
  /** True when the message renders as a centred system/transaction card. */
  isSystemMessage: boolean;
}

/**
 * Caches live in a swappable holder: `WeakMap` instances cannot be cleared, and
 * suites need a way to assert on a fresh computation.
 */
const holder: {
  classification: WeakMap<ChatMessage, MessageClassification>;
  transaction: WeakMap<ChatMessage, TransactionDetails>;
} = {
  classification: new WeakMap(),
  transaction: new WeakMap(),
};

export function classifyMessage(message: ChatMessage): MessageClassification {
  const cached = holder.classification.get(message);
  if (cached) return cached;

  const isKyc = isKycVerificationMessage(message);
  const isPurchase = isPurchaseNotification(message);
  const isPrizeWheel = isPrizeWheelMessage(message);
  const isAuto = isAutoMessage(message);

  const classification: MessageClassification = {
    isAuto,
    isPurchase,
    isPrizeWheel,
    isKyc,
    isSystemMessage: isAuto || isPurchase || isPrizeWheel || isKyc,
  };

  holder.classification.set(message, classification);
  return classification;
}

/**
 * Parsed transaction details, memoised per message.
 *
 * `parseTransactionMessage` runs roughly twenty `String.match` calls. The bubble
 * needs it, and `formatTransactionMessage` used to parse the same text again
 * internally.
 */
type TransactionDetails = ReturnType<typeof parseTransactionMessage>;

export function getTransactionDetails(message: ChatMessage): TransactionDetails {
  const cached = holder.transaction.get(message);
  if (cached) return cached;

  const details = parseTransactionMessage(message.text, message.type, message.operationType);
  holder.transaction.set(message, details);
  return details;
}

/** Test-only: drop every memo. */
export function clearMessageClassificationCaches() {
  holder.classification = new WeakMap();
  holder.transaction = new WeakMap();
}
