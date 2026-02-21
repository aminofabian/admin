// URL regex to detect image links
const IMAGE_URL_REGEX = /https?:\/\/[^\s<>"]+\.(jpg|jpeg|png|gif|bmp|webp|svg)/gi;

// Check if a URL points to an image
export const isImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
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
    const href = url.startsWith('http') ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
};

// Strip HTML tags for preview text
export const stripHtml = (html: string): string => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Message HTML content classes
export const MESSAGE_HTML_CONTENT_CLASS = {
  admin: 'text-[13px] md:text-sm leading-relaxed break-words [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80 [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4',
  player: 'text-[13px] md:text-sm leading-relaxed break-words [&_a]:text-white [&_a]:underline hover:[&_a]:text-white/80 text-white [&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4'
};

// Format a date for display (e.g., "Today", "Yesterday", "Jan 15, 2025")
export const formatMessageDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to midnight for comparison
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

// Check if a message is a purchase notification (should be displayed centered)
export const isPurchaseNotification = (message: { text: string; type?: string; sender?: string; userId?: number }): boolean => {
  if (!message.text) return false;

  // Strip HTML tags for pattern matching
  const textWithoutHtml = stripHtml(message.text).toLowerCase().trim();
  const textWithHtml = message.text.toLowerCase();

  // Check for purchase notification patterns
  const purchasePatterns = [
    /you successfully purchased/i,
    /purchased via/i,
    /purchased \(credited by admin\)/i,
    /credited by admin/i,
    /cashed out/i,
    /recharged to/i,
    /redeemed from/i,
    /added to your (credit|winning) balance/i,
    /deducted from your (credit|winning) balance/i,
    /credits:.*winnings:/i,
    /credits.*winnings/i,
  ];

  // Check if message type indicates it's a purchase notification
  const messageTypeLower = message.type?.toLowerCase();
  if (messageTypeLower === 'purchase_notification' || messageTypeLower === 'balanceupdated') {
    // For balanceupdated, check if it looks like a purchase or balance display
    if (messageTypeLower === 'balanceupdated') {
      return purchasePatterns.some(pattern => pattern.test(textWithHtml) || pattern.test(textWithoutHtml));
    }
    return true;
  }

  // Check if text matches purchase notification patterns (check both HTML and plain text)
  return purchasePatterns.some(pattern => pattern.test(textWithHtml) || pattern.test(textWithoutHtml));
};

// Check if a message is a Binpay KYC verification prompt (display as auto message with button)
export const isKycVerificationMessage = (message: { text: string; type?: string }): boolean => {
  if (!message.text) return false;
  const textWithoutHtml = stripHtml(message.text).toLowerCase().trim();
  const textWithHtml = message.text.toLowerCase();
  const kycPatterns = [
    /binpay.*kyc|kyc.*binpay/i,
    /complete your kyc verification/i,
    /kyc verification.*cashout|cashout.*kyc verification/i,
    /verify kyc/i,
  ];
  return kycPatterns.some(pattern => pattern.test(textWithHtml) || pattern.test(textWithoutHtml));
};

export interface KycMessageParsed {
  link: string | null;
  bodyText: string;
}

// Extract KYC link and body text (without the link) for Binpay KYC messages
export const parseKycMessage = (message: { text: string }): KycMessageParsed => {
  const result: KycMessageParsed = { link: null, bodyText: '' };
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
  let body = message.text
    .replace(/<a\s+href=["'][^"']*["'][^>]*>([^<]*)<\/a>/gi, '') // Remove anchor but we show button instead
    .replace(/<br\s*\/?>/gi, ' ')
    .trim();
  result.bodyText = stripHtml(body).replace(/\s+/g, ' ').trim();
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
  cleanedText = cleanedText.replace(/^<b>(recharge|redeem|balance\s+updated|transaction|system|auto|notification)<\/b>\s*(<br\s*\/?>)?\s*/i, '');

  // Remove standalone bold tags at the start ONLY if followed by a line break
  // This ensures we don't remove <b>$5</b> at the start of a sentence
  cleanedText = cleanedText.replace(/^<b>[^<]+<\/b>\s*(<br\s*\/?>)+\s*/i, '');

  // Remove plain text headings at the start of a line (case-insensitive, multiline)
  // This handles cases like: Recharge\nYou successfully recharged...
  cleanedText = cleanedText.replace(/^(recharge|redeem|balance\s+updated|transaction|system|auto|notification):?\s*$/im, '');

  // Remove any leading line breaks, whitespace, or HTML breaks
  cleanedText = cleanedText.replace(/^(<br\s*\/?>|\s|\n)+/i, '');

  // Clean up any excessive line breaks (more than 2 consecutive)
  cleanedText = cleanedText.replace(/(<br\s*\/?>\s*){3,}/gi, '<br /><br />');

  return cleanedText.trim();
};

// Check if a message is an auto/system message (not sent by staff)
export const isAutoMessage = (message: { text: string; type?: string; sender?: string; userId?: number }): boolean => {
  if (!message.text) return false;

  // Strip HTML tags for pattern matching
  const textWithoutHtml = stripHtml(message.text).toLowerCase().trim();
  const textWithHtml = message.text.toLowerCase();

  // Check for auto message patterns in the text (works with or without HTML)
  const autoPatterns = [
    /<b>recharge<\/b>/i,
    /^recharge$/i, // Only exact "recharge" word, not "purchased"
    /successfully recharged/i, // But not "successfully purchased"
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

  // Don't treat purchase messages as auto messages - they have their own handler
  if (isPurchaseNotification(message)) {
    return false;
  }

  // Check if message type indicates it's an auto message
  const autoTypes = ['system', 'auto', 'notification', 'recharge', 'transaction', 'balance_update'];
  const messageTypeLower = message.type?.toLowerCase();
  if (messageTypeLower && autoTypes.includes(messageTypeLower) && messageTypeLower !== 'balanceupdated') {
    return true;
  }

  // For balanceUpdated type messages, check if they're manual balance operations
  // (credit or winning balance manual top-up/withdraw)
  if (messageTypeLower === 'balanceupdated' || messageTypeLower === 'balance_updated') {
    const hasManualBalanceOperation =
      textWithoutHtml.includes('added to your credit balance') ||
      textWithoutHtml.includes('deducted from your credit balance') ||
      textWithoutHtml.includes('added to your winning balance') ||
      textWithoutHtml.includes('deducted from your winning balance') ||
      textWithHtml.includes('manual top-up') ||
      textWithHtml.includes('manual withdraw');

    // If it's a manual balance operation, treat it as an auto message
    if (hasManualBalanceOperation) {
      return true;
    }

    // Otherwise, don't treat balanceUpdated messages as auto messages
    return false;
  }

  // Check if userId is 0 or undefined (system messages often have no user ID)
  // But ONLY if it's not a purchase notification
  if ((message.userId === 0 || message.userId === undefined) && !isPurchaseNotification(message)) {
    return true;
  }

  // Check if text matches auto message patterns (check both HTML and plain text)
  return autoPatterns.some(pattern => pattern.test(textWithHtml) || pattern.test(textWithoutHtml));
};

/**
 * Parses transaction message text to extract transaction details
 */
interface TransactionDetails {
  type: 'credit_purchase' | 'cashout' | 'credit_added' | 'credit_deducted' | 'winning_added' | 'winning_deducted' | 'recharge' | 'redeem' | null;
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
  operationType?: 'increase' | 'decrease' | null
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
  const isBalanceUpdate = messageType?.toLowerCase() === 'balanceupdated' ||
    messageType?.toLowerCase() === 'balance_updated';

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
      const value = match[1]?.replace(/,/g, '') || match[0]?.replace(/[$,<>b\/\s]/gi, '');
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
      const value = match[1].replace(/,/g, '');
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
      const value = match[1].replace(/,/g, '');
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
      const value = match[1].replace(/,/g, '');
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
      if (gameName.endsWith('.')) {
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
    /via\s+<b>([\w\s]+)<\/b>/i,
    /via\s+([\w\s]+?)(?:\.|$|<br)/i,
  ];

  for (const pattern of paymentPatterns) {
    const match = originalText.match(pattern);
    if (match && match[1]) {
      const method = stripHtml(match[1]).trim();
      if (method && method.length > 1 && !/^\d+$/.test(method)) {
        result.paymentMethod = method;
        break;
      }
    }
  }

  // Determine transaction type based on text patterns (order matters - more specific first)

  // Rule 1: Always check for specific automated transaction keywords first
  if (cleanText.includes('credited by admin')) {
    result.type = 'credit_added';
  } else if (cleanText.includes('successfully cashed out') || cleanText.includes('cashed out')) {
    result.type = 'cashout';
  } else if (cleanText.includes('successfully purchased') || (cleanText.includes('purchased') && cleanText.includes('credit'))) {
    result.type = 'credit_purchase';
  } else if (cleanText.includes('successfully recharged') || cleanText.includes('recharged')) {
    result.type = 'recharge';
  } else if (cleanText.includes('successfully redeemed') || cleanText.includes('redeemed')) {
    result.type = 'redeem';
  }
  // Rule 2: Handle manual operations or generic balance updates
  else if (isBalanceUpdate ||
    cleanText.includes('added to your') ||
    cleanText.includes('deducted from your') ||
    operationType) {

    // Check for deduction indicators
    const hasDeductionIndicators =
      operationType === 'decrease' ||
      cleanText.includes('deducted') ||
      cleanText.includes('withdraw') ||
      cleanText.includes('decrease') ||
      cleanText.includes('minus') ||
      cleanText.includes('remove') ||
      cleanText.includes('subtract');

    if (hasDeductionIndicators) {
      result.type = cleanText.includes('winning') ? 'winning_deducted' : 'credit_deducted';
    } else {
      result.type = cleanText.includes('winning') ? 'winning_added' : 'credit_added';
    }
  }

  return result;
};

/**
 * Formats a transaction message according to the specified format.
 * Now simplified to show the message as it appears from the source,
 * only applying color to bolded elements.
 */
export const formatTransactionMessage = (
  message: {
    text: string;
    userBalance?: string;
    winningBalance?: string;
    type?: string;
    operationType?: 'increase' | 'decrease' | null;
    bonusAmount?: string | null;
    paymentMethod?: string | null;
  }
): string => {
  if (!message.text) return '';

  // Remove automated headings like "Recharge" or "Redeem" as requested
  const textWithoutHeading = removeAutomatedMessageHeading(message.text);

  const details = parseTransactionMessage(message.text, message.type, message.operationType);

  // Identify the color based on transaction type:
  // Red: Cashout, Redeem (money leaving the system)
  // Green: Purchase, Recharge (money entering the system)
  // Purple: Manual transactions from chat (add/deduct credit & add/deduct winnings)
  let colorClass = 'text-purple-600 dark:text-purple-400'; // Default: manual transactions

  if (details.type === 'recharge' || details.type === 'credit_purchase') {
    // Green for purchase and recharge
    colorClass = 'text-green-600 dark:text-green-400';
  } else if (details.type === 'cashout' || details.type === 'redeem') {
    // Red for cashout and redeem
    colorClass = 'text-red-600 dark:text-red-400';
  }
  // Purple is default for: credit_added, credit_deducted, winning_added, winning_deducted (manual operations)

  const boldClass = `text-[0.92em] font-bold ${colorClass}`;

  // Just return the original text but apply the transaction-specific color 
  // to any bolded elements (which usually contain the amounts/balances)
  return textWithoutHeading
    .replace(/<b>(.*?)<\/b>/g, `<b class="${boldClass}">$1</b>`)
    // Remove bold from labels if they were bolded in source to keep it clean,
    // as requested to "remove formatting" while keeping color on values
    .replace(/<b>(Credits:|Winnings:)<\/b>/gi, '$1');
};
