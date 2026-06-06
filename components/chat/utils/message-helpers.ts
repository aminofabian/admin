import { formatCurrency } from "@/lib/utils/formatters";

// URL regex to detect image links
const IMAGE_URL_REGEX =
  /https?:\/\/[^\s<>"]+\.(jpg|jpeg|png|gif|bmp|webp|svg)/gi;

/** USD amounts in chat HTML from the server often use 1 or 4+ fraction digits; normalize to two. */
export function normalizeDollarAmountsInChatHtml(html: string): string {
  if (!html) return html;
  return html.replace(/\$[\d,]+(?:\.\d+)?/g, (token) => {
    const n = parseFloat(token.slice(1).replace(/,/g, ""));
    return Number.isFinite(n) ? formatCurrency(n) : token;
  });
}

// Check if a URL points to an image
export const isImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".svg",
  ];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.includes(ext));
};

// Extract image URLs from text
export const extractImageUrls = (text: string | null | undefined): string[] => {
  if (!text) return [];
  const matches = text.match(IMAGE_URL_REGEX);
  return matches || [];
};

// HTML tag regex
const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/i;

export const hasHtmlContent = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return HTML_TAG_REGEX.test(value);
};

// Convert plain text URLs to clickable links
export const linkifyText = (text: string): string => {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
  return text.replace(urlRegex, (url) => {
    const href = url.startsWith("http") ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
};

// Strip HTML tags for preview text (SSR-safe fallback when document is unavailable)
export const stripHtml = (html: string): string => {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

/**
 * Informal signup-bonus chat (e.g. "Added 20 signup bonus for u") — regular bubble.
 * Ledger-style copy (amount + "added as Sign Up Bonus", Balance:/Credits:/Winnings:) stays a transaction card.
 */
function isSignupBonusChatCopy(message: { text: string }): boolean {
  if (!message.text) return false;
  const plain = stripHtml(message.text);
  if (
    !/sign[\s-]?up bonus/i.test(plain) &&
    !/sign[\s-]?up bonus/i.test(message.text)
  ) {
    return false;
  }
  const lower = plain.toLowerCase();
  if (
    /\bbalance\s*:/i.test(lower) ||
    /\bcredits?\s*:/i.test(lower) ||
    /winnings?\s*:/i.test(lower)
  ) {
    return false;
  }
  if (/\$[\d,]+\.?\d*\s+added as\s+sign[\s-]?up bonus/i.test(plain)) {
    return false;
  }
  return true;
}

/**
 * Remove "Winnings: …" lines from server chat templates (single-balance product).
 * Handles HTML `<br>` blocks and plain newlines.
 */
export function stripWinningsLineFromChatMessage(text: string): string {
  if (!text) return text;
  let s = text;
  s = s.replace(/(?:<br\s*\/?>\s*)+Winnings?\s*:\s*<b>[\s\S]*?<\/b>/gi, "");
  s = s.replace(/(?:<br\s*\/?>\s*)+Winnings?\s*:\s*[^<\n]+/gi, "");
  s = s.replace(
    /^Winnings?\s*:\s*<b>[\s\S]*?<\/b>\s*(?:<br\s*\/?>\s*)?/gim,
    "",
  );
  s = s.replace(/\r?\n\s*Winnings?\s*:\s*[^\n\r]*/gi, "");
  s = s.replace(/(?:<br\s*\/?>\s*)+$/gi, "");
  return s.trim();
}

/**
 * Show "Balance:" instead of server "Credits:" / "Credit balance:" in chat UI.
 */
export function relabelCreditsToBalanceInChatMessage(text: string): string {
  if (!text) return text;
  let s = text;
  s = s.replace(/<b>\s*Credits?\s*:\s*<\/b>/gi, "<b>Balance:</b>");
  s = s.replace(/\b[Cc]redit\s+[Bb]alance\s*:/g, "Balance:");
  s = s.replace(/\bCredits?\s*:/gi, "Balance:");
  return s;
}

/** Strip winnings line + relabel credits→balance for any rendered chat HTML. */
export function prepareChatMessageHtmlForDisplay(text: string): string {
  return normalizeDollarAmountsInChatHtml(
    relabelCreditsToBalanceInChatMessage(
      stripWinningsLineFromChatMessage(text),
    ),
  );
}

// Message HTML content classes
export const MESSAGE_HTML_CONTENT_CLASS = {
  admin:
    "min-w-0 max-w-full text-[13px] md:text-sm leading-relaxed break-words [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80 [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4",
  player:
    "min-w-0 max-w-full text-[13px] md:text-sm leading-relaxed break-words [overflow-wrap:anywhere] [&_a]:text-white [&_a]:underline hover:[&_a]:text-white/80 text-white [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4",
};

// Format a date for display (actual date only, e.g., "Jan 15, 2025")
export const formatMessageDate = (dateString: string): string => {
  const date = new Date(dateString);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
};

/** Prize wheel / roulette auto chat (daily bonus, spin wins, balance prizes). */
export const isPrizeWheelMessage = (message: {
  text: string;
  type?: string;
}): boolean => {
  if (!message.text) return false;

  const textWithoutHtml = stripHtml(message.text).toLowerCase().trim();
  const textWithHtml = message.text.toLowerCase();

  const prizeWheelPatterns = [
    /won from (?:the\s+)?(?:prize\s*wheel|roulette(?:\s+wheel)?)/i,
    /spin(?:s)? added as daily bonus/i,
    /spin(?:s)? (?:added|deducted) (?:to|from) (?:your )?(?:prize\s*wheel|roulette)/i,
    /(?:prize\s*wheel|roulette) (?:balance|spin)/i,
    /spin(?:s)? won from (?:the\s+)?(?:prize\s*wheel|roulette)/i,
    /(?:prize|reward):\s*(?:\$\d|(?:\d+\s*)?respin|try\s*again|free\s*spin)/i,
    /\d+\s*spin(?:s)?\s+won\b/i,
    /try\s*again.*(?:spin|wheel|roulette)/i,
    /free\s*respin/i,
  ];

  const messageTypeLower = message.type?.toLowerCase() ?? "";
  if (
    messageTypeLower === "roulette" ||
    messageTypeLower.includes("roulette") ||
    messageTypeLower.includes("prize_wheel") ||
    messageTypeLower === "spin_reward" ||
    messageTypeLower === "prize_wheel_notification"
  ) {
    return true;
  }

  return prizeWheelPatterns.some(
    (pattern) => pattern.test(textWithHtml) || pattern.test(textWithoutHtml),
  );
};

export type PrizeWheelMessageKind =
  | "daily_bonus"
  | "cash_win"
  | "respin"
  | "spin_adjustment"
  | "generic";

export interface PrizeWheelMessageParsed {
  kind: PrizeWheelMessageKind;
  title: string;
  spinCount: string | null;
  amount: string | null;
  balance: string | null;
  prizeLabel: string | null;
  bodyHtml: string;
  cardClass: string;
  glowClass: string;
  accentClass: string;
  iconClass: string;
  prizeChipClass: string;
}

const PRIZE_WHEEL_THEMES: Record<
  PrizeWheelMessageKind,
  Omit<
    PrizeWheelMessageParsed,
    | "spinCount"
    | "amount"
    | "balance"
    | "prizeLabel"
    | "bodyHtml"
    | "kind"
  >
> = {
  daily_bonus: {
    title: "Daily Bonus",
    cardClass:
      "border-sky-500/35 bg-gradient-to-br from-sky-500/12 via-cyan-500/8 to-blue-500/10 dark:from-sky-950/50 dark:via-cyan-950/35 dark:to-blue-950/40",
    glowClass: "from-sky-400/25 via-cyan-300/20 to-blue-400/25",
    accentClass: "text-sky-600 dark:text-sky-400",
    iconClass: "text-sky-500 dark:text-sky-400",
    prizeChipClass:
      "bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300",
  },
  cash_win: {
    title: "Prize Won",
    cardClass:
      "border-amber-500/35 bg-gradient-to-br from-amber-500/14 via-yellow-500/10 to-orange-500/12 dark:from-amber-950/55 dark:via-yellow-950/40 dark:to-orange-950/45",
    glowClass: "from-amber-400/30 via-yellow-300/25 to-orange-400/30",
    accentClass: "text-amber-600 dark:text-amber-400",
    iconClass: "text-amber-500 dark:text-amber-400",
    prizeChipClass:
      "bg-amber-500/18 border-amber-500/35 text-amber-800 dark:text-amber-200",
  },
  respin: {
    title: "Lucky Spin",
    cardClass:
      "border-violet-500/35 bg-gradient-to-br from-violet-500/12 via-purple-500/10 to-fuchsia-500/10 dark:from-violet-950/50 dark:via-purple-950/40 dark:to-fuchsia-950/40",
    glowClass: "from-violet-400/25 via-purple-300/20 to-fuchsia-400/25",
    accentClass: "text-violet-600 dark:text-violet-400",
    iconClass: "text-violet-500 dark:text-violet-400",
    prizeChipClass:
      "bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300",
  },
  spin_adjustment: {
    title: "Spin Balance",
    cardClass:
      "border-emerald-500/35 bg-gradient-to-br from-emerald-500/12 via-teal-500/8 to-green-500/10 dark:from-emerald-950/50 dark:via-teal-950/35 dark:to-green-950/40",
    glowClass: "from-emerald-400/25 via-teal-300/20 to-green-400/25",
    accentClass: "text-emerald-600 dark:text-emerald-400",
    iconClass: "text-emerald-500 dark:text-emerald-400",
    prizeChipClass:
      "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  },
  generic: {
    title: "Prize Wheel",
    cardClass:
      "border-amber-500/35 bg-gradient-to-br from-amber-500/12 via-yellow-500/8 to-orange-500/10 dark:from-amber-950/50 dark:via-yellow-950/35 dark:to-orange-950/40",
    glowClass: "from-amber-400/25 via-yellow-300/20 to-orange-400/25",
    accentClass: "text-amber-600 dark:text-amber-400",
    iconClass: "text-amber-500 dark:text-amber-400",
    prizeChipClass:
      "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
  },
};

function inferPrizeWheelKind(plain: string): PrizeWheelMessageKind {
  const lower = plain.toLowerCase();
  if (/spin(?:s)? added as daily bonus/.test(lower)) return "daily_bonus";
  if (
    (/respin|try\s*again|free\s*spin/i.test(lower) && /prize\s*:/i.test(lower)) ||
    (/respin|try\s*again/i.test(lower) &&
      /(?:prize\s*wheel|roulette|spin)/i.test(lower))
  ) {
    return "respin";
  }
  if (
    /won from (?:the\s+)?(?:prize\s*wheel|roulette)/i.test(lower) &&
    /\$/.test(lower)
  ) {
    return "cash_win";
  }
  if (/won from (?:the\s+)?(?:prize\s*wheel|roulette)/i.test(lower)) {
    return "respin";
  }
  if (/spin(?:s)? (?:added|deducted)/.test(lower)) return "spin_adjustment";
  return "generic";
}

/** Structured prize wheel copy for the dedicated chat card UI. */
export function parsePrizeWheelMessage(text: string): PrizeWheelMessageParsed {
  const plain = stripHtml(text);
  const kind = inferPrizeWheelKind(plain);
  const theme = PRIZE_WHEEL_THEMES[kind];

  const spinCount =
    plain.match(/(\d+)\s*spins?\s+added as daily bonus/i)?.[1] ??
    plain.match(
      /(\d+)\s*spin(?:s)?\s+won from (?:the\s+)?(?:prize\s*wheel|roulette)/i,
    )?.[1] ??
    null;

  const amount =
    plain.match(/\$([\d,]+(?:\.\d+)?)/)?.[1]?.replace(/,/g, "") ?? null;

  const balance =
    plain.match(/balance:\s*\$?([\d,]+(?:\.\d+)?)/i)?.[1]?.replace(/,/g, "") ??
    null;

  const prizeMatch = plain.match(/prize:\s*(.+)/i);
  const prizeLabel =
    prizeMatch?.[1]?.trim().replace(/\.$/, "") ?? null;

  let bodySource = text;
  if (prizeLabel) {
    bodySource = bodySource.replace(
      /\s*\.?\s*prize:\s*[^.<]+(?:\.|<br\s*\/?>)?/gi,
      "",
    );
  }

  const bodyHtml = formatTransactionMessage({
    text: bodySource,
    type: "prize_wheel",
  })
    .replace(/\n/g, "<br />")
    .replace(/<br\s*\/?>/gi, "<br />")
    .replace(/(<br\s*\/?>\s*)+$/gi, "")
    .trim();

  return {
    kind,
    ...theme,
    spinCount,
    amount,
    balance,
    prizeLabel,
    bodyHtml,
  };
}

// Check if a message is a purchase notification (should be displayed centered)
export const isPurchaseNotification = (message: {
  text: string;
  type?: string;
  sender?: string;
  userId?: number;
}): boolean => {
  if (!message.text) return false;
  if (isSignupBonusChatCopy(message)) return false;

  // Strip HTML tags for pattern matching
  const textWithoutHtml = stripHtml(message.text).toLowerCase().trim();
  const textWithHtml = message.text.toLowerCase();

  // Check for purchase notification patterns
  const purchasePatterns = [
    /you successfully purchased/i,
    /purchased via/i,
    /purchased \(credited by admin\)/i,
    /credited by admin/i,
    /\$[\d,]+\.?\d*\s+added as\s+sign[\s-]?up bonus/i,
    /sign[\s-]?up bonus[\s\S]{0,240}\bbalance\s*:/i,
    /sign[\s-]?up bonus[\s\S]{0,240}\bcredits?\s*:/i,
    /sign[\s-]?up bonus[\s\S]{0,240}\bwinnings?\s*:/i,
    // Do not match colloquial "cashed out" in player chat (e.g. "someone cashed out my winnings")
    /successfully cashed out/i,
    /cashed out via/i,
    /recharged to/i,
    /redeemed from/i,
    /added to your (credit|winning) balance/i,
    /deducted from your (credit|winning) balance/i,
    /credits:.*winnings:/i,
    /credits.*winnings/i,
  ];

  // Check if message type indicates it's a purchase notification
  const messageTypeLower = message.type?.toLowerCase();
  if (
    messageTypeLower === "purchase_notification" ||
    messageTypeLower === "balanceupdated"
  ) {
    // For balanceupdated, check if it looks like a purchase or balance display
    if (messageTypeLower === "balanceupdated") {
      return purchasePatterns.some(
        (pattern) =>
          pattern.test(textWithHtml) || pattern.test(textWithoutHtml),
      );
    }
    return true;
  }

  // Check if text matches purchase notification patterns (check both HTML and plain text)
  return purchasePatterns.some(
    (pattern) => pattern.test(textWithHtml) || pattern.test(textWithoutHtml),
  );
};

// Check if a message is a Binpay KYC verification prompt (display as auto message with button)
export const isKycVerificationMessage = (message: {
  text: string;
  type?: string;
}): boolean => {
  if (!message.text) return false;
  const textWithoutHtml = stripHtml(message.text).toLowerCase().trim();
  const textWithHtml = message.text.toLowerCase();
  const kycPatterns = [
    /binpay.*kyc|kyc.*binpay/i,
    /complete your kyc verification/i,
    /kyc verification.*cashout|cashout.*kyc verification/i,
    /verify kyc/i,
  ];
  return kycPatterns.some(
    (pattern) => pattern.test(textWithHtml) || pattern.test(textWithoutHtml),
  );
};

export interface KycMessageParsed {
  link: string | null;
  bodyText: string;
}

// Extract KYC link and body text (without the link) for Binpay KYC messages
export const parseKycMessage = (message: {
  text: string;
}): KycMessageParsed => {
  const result: KycMessageParsed = { link: null, bodyText: "" };
  if (!message.text) return result;

  // Extract first <a href="..."> from HTML
  const hrefMatch = message.text.match(/<a\s+href=["']([^"']+)["'][^>]*>/i);
  if (hrefMatch?.[1]) {
    result.link = hrefMatch[1].trim();
  } else {
    // Fallback: first https URL in text
    const urlMatch = message.text.match(/https?:\/\/[^\s<>"']+/i);
    if (urlMatch) result.link = urlMatch[0].trim();
  }

  // Body: strip <a> tags (keep text between tags), then strip other HTML for display
  const body = message.text
    .replace(/<a\s+href=["'][^"']*["'][^>]*>([^<]*)<\/a>/gi, "") // Remove anchor but we show button instead
    .replace(/<br\s*\/?>/gi, " ")
    .trim();
  result.bodyText = stripHtml(body).replace(/\s+/g, " ").trim();
  return result;
};

/**
 * Remove heading from automated messages (e.g., "Recharge", "Redeem")
 * Removes the first line or bold tag that contains common automated message headings
 */
export const removeAutomatedMessageHeading = (text: string): string => {
  if (!text) return text;

  let cleanedText = text;

  // Remove HTML bold heading tags at the start (e.g., <b>Recharge</b> or <b>Redeem</b>)
  // This handles cases like: <b>Recharge</b><br />You successfully recharged...
  // We only remove it if it matches known keywords or is followed by a line break AND doesn't look like an amount
  cleanedText = cleanedText.replace(
    /^<b>(recharge|redeem|balance\s+updated|transaction|system|auto|notification)<\/b>\s*(<br\s*\/?>)?\s*/i,
    "",
  );

  // Remove standalone bold tags at the start ONLY if followed by a line break
  // This ensures we don't remove <b>$5</b> at the start of a sentence
  cleanedText = cleanedText.replace(/^<b>[^<]+<\/b>\s*(<br\s*\/?>)+\s*/i, "");

  // Remove plain text headings at the start of a line (case-insensitive, multiline)
  // This handles cases like: Recharge\nYou successfully recharged...
  cleanedText = cleanedText.replace(
    /^(recharge|redeem|balance\s+updated|transaction|system|auto|notification):?\s*$/im,
    "",
  );

  // Remove any leading line breaks, whitespace, or HTML breaks
  cleanedText = cleanedText.replace(/^(<br\s*\/?>|\s|\n)+/i, "");

  // Clean up any excessive line breaks (more than 2 consecutive)
  cleanedText = cleanedText.replace(/(<br\s*\/?>\s*){3,}/gi, "<br /><br />");

  return cleanedText.trim();
};

// Check if a message is an auto/system message (not sent by staff)
export const isAutoMessage = (message: {
  text: string;
  type?: string;
  sender?: string;
  userId?: number;
}): boolean => {
  if (!message.text) return false;
  if (isSignupBonusChatCopy(message)) return false;

  // Strip HTML tags for pattern matching
  const textWithoutHtml = stripHtml(message.text).toLowerCase().trim();
  const textWithHtml = message.text.toLowerCase();

  // Check for auto message patterns in the text (works with or without HTML)
  const autoPatterns = [
    /<b>recharge<\/b>/i,
    /^recharge$/i, // Only exact "recharge" word, not "purchased"
    /successfully recharged/i, // But not "successfully purchased"
    /\$[\d,]+\.?\d*\s+added as\s+sign[\s-]?up bonus/i,
    /sign[\s-]?up bonus[\s\S]{0,240}\bbalance\s*:/i,
    /sign[\s-]?up bonus[\s\S]{0,240}\bcredits?\s*:/i,
    /sign[\s-]?up bonus[\s\S]{0,240}\bwinnings?\s*:/i,
    /^system:/i,
    /^auto:/i,
    /^notification:/i,
    /transaction (completed|pending|failed)/i,
    /^balance updated$/i, // Only exact phrase, not in purchase messages
    // Manual balance operations (both credit and winning)
    /added to your (credit|winning) balance/i,
    /deducted from your (credit|winning) balance/i,
    /manual top-up/i,
    /manual withdraw/i,
  ];

  // Don't treat purchase / prize wheel messages as auto messages - they have their own handler
  if (isPurchaseNotification(message) || isPrizeWheelMessage(message)) {
    return false;
  }

  // Check if message type indicates it's an auto message
  const autoTypes = [
    "system",
    "auto",
    "notification",
    "recharge",
    "transaction",
    "balance_update",
  ];
  const messageTypeLower = message.type?.toLowerCase();
  if (
    messageTypeLower &&
    autoTypes.includes(messageTypeLower) &&
    messageTypeLower !== "balanceupdated"
  ) {
    return true;
  }

  // For balanceUpdated type messages, check if they're manual balance operations
  // (credit or winning balance manual top-up/withdraw)
  if (
    messageTypeLower === "balanceupdated" ||
    messageTypeLower === "balance_updated"
  ) {
    const hasManualBalanceOperation =
      textWithoutHtml.includes("added to your credit balance") ||
      textWithoutHtml.includes("deducted from your credit balance") ||
      textWithoutHtml.includes("added to your winning balance") ||
      textWithoutHtml.includes("deducted from your winning balance") ||
      textWithHtml.includes("manual top-up") ||
      textWithHtml.includes("manual withdraw");

    // If it's a manual balance operation, treat it as an auto message
    if (hasManualBalanceOperation) {
      return true;
    }

    // Otherwise, don't treat balanceUpdated messages as auto messages
    return false;
  }

  // Check if userId is 0 or undefined (system messages often have no user ID)
  // But ONLY if it's not a purchase notification
  if (
    (message.userId === 0 || message.userId === undefined) &&
    !isPurchaseNotification(message) &&
    !isPrizeWheelMessage(message)
  ) {
    return true;
  }

  // Check if text matches auto message patterns (check both HTML and plain text)
  return autoPatterns.some(
    (pattern) => pattern.test(textWithHtml) || pattern.test(textWithoutHtml),
  );
};

/**
 * Parses transaction message text to extract transaction details
 */
interface TransactionDetails {
  type:
    | "credit_purchase"
    | "cashout"
    | "credit_added"
    | "credit_deducted"
    | "winning_added"
    | "winning_deducted"
    | "recharge"
    | "redeem"
    | "prize_wheel"
    | null;
  amount: string | null;
  credits: string | null;
  winnings: string | null;
  gameName: string | null;
  paymentMethod: string | null;
  bonusAmount?: string | null;
}

export const parseTransactionMessage = (
  text: string,
  messageType?: string,
  operationType?: "increase" | "decrease" | null,
): TransactionDetails => {
  const result: TransactionDetails = {
    type: null,
    amount: null,
    credits: null,
    winnings: null,
    gameName: null,
    paymentMethod: null,
  };

  if (!text) return result;

  // Check message type first - if it's a balance update, prioritize manual operations
  const isBalanceUpdate =
    messageType?.toLowerCase() === "balanceupdated" ||
    messageType?.toLowerCase() === "balance_updated";

  // Strip HTML tags for parsing
  const cleanText = stripHtml(text).toLowerCase();
  const originalText = text;

  // Extract amount - look for $X patterns, prioritizing amounts in the main message
  // Handle HTML tags like "<b>$10</b>"
  const amountPatterns = [
    /<b>[\s\$]*([\d,]+\.?\d*)[\s\$]*<\/b>/i, // <b>$10</b>
    /\$([\d,]+\.?\d*)/g, // $5, $5.00, $1,234.56
    /([\d,]+\.?\d*)\s*(?:credit|dollar|usd)/gi, // 5 credit, 5 dollars
  ];

  for (const pattern of amountPatterns) {
    let match;
    if (pattern.global) {
      // Use matchAll for global patterns
      const matches = originalText.matchAll(pattern);
      match = matches.next().value;
    } else {
      // Use match for non-global patterns
      match = originalText.match(pattern);
    }

    if (match) {
      const value =
        match[1]?.replace(/,/g, "") || match[0]?.replace(/[$,<>b\/\s]/gi, "");
      if (value && !isNaN(parseFloat(value))) {
        result.amount = value;
        break;
      }
    }
  }

  // Extract credits balance - handle HTML tags like "Credits: <b>$109.20</b>"
  const creditsPatterns = [
    /credits?[:\s]*(?:<[^>]+>)*\$?([\d,]+\.?\d*)(?:<\/[^>]+>)*/i,
    /credits?[:\s]*<b>[\s\$]*([\d,]+\.?\d*)[\s\$]*<\/b>/i,
    /credits?[:\s]*\$?([\d,]+\.?\d*)/i,
    /credit\s+balance[:\s]*(?:<[^>]+>)*\$?([\d,]+\.?\d*)(?:<\/[^>]+>)*/i,
  ];

  for (const pattern of creditsPatterns) {
    const match = originalText.match(pattern);
    if (match && match[1]) {
      const value = match[1].replace(/,/g, "");
      if (value && !isNaN(parseFloat(value))) {
        result.credits = value;
        break;
      }
    }
  }

  // Extract winnings balance - handle HTML tags like "Winnings: <b>$28.00</b>"
  const winningsPatterns = [
    /winnings?[:\s]*(?:<[^>]+>)*\$?([\d,]+\.?\d*)(?:<\/[^>]+>)*/i,
    /winnings?[:\s]*<b>[\s\$]*([\d,]+\.?\d*)[\s\$]*<\/b>/i,
    /winnings?[:\s]*\$?([\d,]+\.?\d*)/i,
    /winning\s+balance[:\s]*(?:<[^>]+>)*\$?([\d,]+\.?\d*)(?:<\/[^>]+>)*/i,
  ];

  for (const pattern of winningsPatterns) {
    const match = originalText.match(pattern);
    if (match && match[1]) {
      const value = match[1].replace(/,/g, "");
      if (value && !isNaN(parseFloat(value))) {
        result.winnings = value;
        break;
      }
    }
  }

  // Extract bonus amount
  const bonusPatterns = [
    /with\s+[\s\$]*([\d,]+\.?\d*)\s*bonus/i,
    /bonus[:\s]*[\s\$]*([\d,]+\.?\d*)/i,
    /<b>[\s\$]*([\d,]+\.?\d*)[\s\$]*<\/b>\s*bonus/i,
  ];

  for (const pattern of bonusPatterns) {
    const match = originalText.match(pattern);
    if (match && match[1]) {
      const value = match[1].replace(/,/g, "");
      if (value && !isNaN(parseFloat(value))) {
        result.bonusAmount = value;
        break;
      }
    }
  }

  // Extract game name (for recharge/redeem) - look for "to {Game Name}" or "from {Game Name}"
  const gamePatterns = [
    /(?:to|from)\s+((?:<[^>]+>|[^\n<])+?)(?:\s*(?:\.<br|\.<|<\/|<br|$))/i,
    /(?:to|from)\s+([A-Z][^.\n<]+?)(?:\.|$|<br)/i, // Capitalized game names
  ];

  for (const pattern of gamePatterns) {
    const match = originalText.match(pattern);
    if (match && match[1]) {
      let gameName = stripHtml(match[1]).trim();
      // Remove trailing period if captured
      if (gameName.endsWith(".")) {
        gameName = gameName.slice(0, -1);
      }
      // Only accept if it looks like a game name (not just a number or single word)
      if (gameName.length > 1 && !/^\d+$/.test(gameName)) {
        result.gameName = gameName;
        break;
      }
    }
  }

  // Extract payment method (for purchase) - look for "via {Payment Method}"
  const paymentPatterns = [
    /via\s+<b>([^<]+)<\/b>/i,
    /via\s+([\w\s]+?)(?:\.|$|<br)/i,
  ];

  for (const pattern of paymentPatterns) {
    const match = originalText.match(pattern);
    if (match && match[1]) {
      const method = stripHtml(match[1]).trim().replace(/\.+$/, "");
      if (method && method.length > 1 && !/^\d+$/.test(method)) {
        result.paymentMethod = method;
        break;
      }
    }
  }

  // Determine transaction type based on text patterns (order matters - more specific first)

  // Rule 1: Always check for specific automated transaction keywords first
  if (cleanText.includes("credited by admin")) {
    result.type = "credit_added";
  } else if (
    cleanText.includes("successfully cashed out") ||
    cleanText.includes("cashed out via")
  ) {
    result.type = "cashout";
  } else if (
    cleanText.includes("successfully purchased") ||
    cleanText.includes("purchased via") ||
    (cleanText.includes("purchased") && cleanText.includes("credit"))
  ) {
    result.type = "credit_purchase";
  } else if (
    cleanText.includes("successfully recharged") ||
    cleanText.includes("recharged")
  ) {
    result.type = "recharge";
  } else if (
    cleanText.includes("successfully redeemed") ||
    cleanText.includes("redeemed")
  ) {
    result.type = "redeem";
  } else if (
    /won from (?:the\s+)?(?:prize wheel|roulette)/.test(cleanText) ||
    cleanText.includes("added as daily bonus") ||
    /(?:prize wheel|roulette) balance/.test(cleanText) ||
    /spin(?:s)? (?:added|deducted) (?:to|from) (?:your )?(?:prize wheel|roulette)/.test(
      cleanText,
    ) ||
    (/prize\s*:/.test(cleanText) &&
      /(?:respin|try again|free spin)/.test(cleanText))
  ) {
    result.type = "prize_wheel";
  }
  // Rule 2: Handle manual operations or generic balance updates
  else if (
    isBalanceUpdate ||
    cleanText.includes("added to your") ||
    cleanText.includes("deducted from your") ||
    operationType
  ) {
    // Check for deduction indicators
    const hasDeductionIndicators =
      operationType === "decrease" ||
      cleanText.includes("deducted") ||
      cleanText.includes("withdraw") ||
      cleanText.includes("decrease") ||
      cleanText.includes("minus") ||
      cleanText.includes("remove") ||
      cleanText.includes("subtract");

    if (hasDeductionIndicators) {
      result.type = cleanText.includes("winning")
        ? "winning_deducted"
        : "credit_deducted";
    } else {
      result.type = cleanText.includes("winning")
        ? "winning_added"
        : "credit_added";
    }
  }

  return result;
};

/** UI color bucket for ledger / transaction chat cards. */
export type TransactionVisualKind =
  | "purchase"
  | "withdraw"
  | "recharge"
  | "redeem"
  | "prize_wheel"
  | "manual";

export function transactionTypeToVisualKind(
  type: TransactionDetails["type"],
): TransactionVisualKind {
  switch (type) {
    case "credit_purchase":
      return "purchase";
    case "cashout":
      return "withdraw";
    case "recharge":
      return "recharge";
    case "redeem":
      return "redeem";
    case "prize_wheel":
      return "prize_wheel";
    default:
      return "manual";
  }
}

/** Bold amount / label accent in transaction HTML. */
export function getTransactionTextColorClass(
  kind: TransactionVisualKind,
): string {
  switch (kind) {
    case "purchase":
      return "text-green-600 dark:text-green-400";
    case "withdraw":
      return "text-red-600 dark:text-red-400";
    case "recharge":
      return "text-purple-600 dark:text-purple-400";
    case "redeem":
      return "text-orange-600 dark:text-orange-400";
    case "prize_wheel":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-purple-600 dark:text-purple-400";
  }
}

/** Centered transaction card tint on admin chat. */
export function getTransactionCardClass(kind: TransactionVisualKind): string {
  switch (kind) {
    case "purchase":
      return "bg-green-500/10 border-green-500/30";
    case "withdraw":
      return "bg-red-500/10 border-red-500/30";
    case "recharge":
      return "bg-purple-500/10 border-purple-500/30";
    case "redeem":
      return "bg-orange-500/10 border-orange-500/30";
    case "prize_wheel":
      return "bg-amber-500/10 border-amber-500/30";
    default:
      return "bg-purple-500/10 border-purple-500/30";
  }
}

/**
 * Formats a transaction message according to the specified format.
 * Now simplified to show the message as it appears from the source,
 * only applying color to bolded elements.
 */
export const formatTransactionMessage = (message: {
  text: string;
  userBalance?: string;
  winningBalance?: string;
  type?: string;
  operationType?: "increase" | "decrease" | null;
  bonusAmount?: string | null;
  paymentMethod?: string | null;
}): string => {
  if (!message.text) return "";

  // Remove automated headings like "Recharge" or "Redeem" as requested
  const textWithoutHeading = prepareChatMessageHtmlForDisplay(
    removeAutomatedMessageHeading(message.text),
  );

  const details = parseTransactionMessage(
    message.text,
    message.type,
    message.operationType,
  );
  const visualKind = transactionTypeToVisualKind(details.type);
  const colorClass = getTransactionTextColorClass(visualKind);
  const boldClass = `text-[0.92em] font-bold ${colorClass}`;

  // Unbold labels before wrapping amounts so "Balance:" stays plain while $ amounts get color
  const unboldLabels = textWithoutHeading.replace(
    /<b>\s*(Balance:|Credits:|Winnings:)\s*<\/b>/gi,
    "$1",
  );

  return unboldLabels.replace(
    /<b>(.*?)<\/b>/g,
    `<b class="${boldClass}">$1</b>`,
  );
};
