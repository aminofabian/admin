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
    /credits:.*winnings:/i,
    /credits.*winnings/i,
  ];
  
  // Check if message type indicates it's a purchase notification
  const messageTypeLower = message.type?.toLowerCase();
  if (messageTypeLower === 'balanceupdated' || messageTypeLower === 'purchase_notification') {
    return true;
  }
  
  // Check if text matches purchase notification patterns (check both HTML and plain text)
  return purchasePatterns.some(pattern => pattern.test(textWithHtml) || pattern.test(textWithoutHtml));
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
  cleanedText = cleanedText.replace(/^<b>(recharge|redeem|balance\s+updated|transaction|system|auto|notification)<\/b>\s*(<br\s*\/?>)?\s*/i, '');
  
  // Remove standalone bold tags at the start (any bold tag on its own line)
  // This handles cases like: <b>Some Heading</b><br />Content...
  cleanedText = cleanedText.replace(/^<b>[^<]*<\/b>\s*(<br\s*\/?>)?\s*/i, '');
  
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
  
  // Don't treat balanceUpdated type messages as auto messages
  if (messageTypeLower === 'balanceupdated') {
    return false;
  }
  
  // Check if userId is 0 or undefined (system messages often have no user ID)
  if (message.userId === 0 || message.userId === undefined) {
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
}

export const parseTransactionMessage = (text: string, messageType?: string): TransactionDetails => {
  const result: TransactionDetails = {
    type: null,
    amount: null,
    credits: null,
    winnings: null,
    gameName: null,
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

  // Extract game name (for recharge/redeem) - look for "to {Game Name}" or "from {Game Name}"
  const gamePatterns = [
    /(?:to|from)\s+([^.\n<]+?)(?:\.|$|<br)/i,
    /(?:to|from)\s+([A-Z][^.\n<]+?)(?:\.|$|<br)/i, // Capitalized game names
  ];
  
  for (const pattern of gamePatterns) {
    const match = originalText.match(pattern);
    if (match && match[1]) {
      const gameName = stripHtml(match[1]).trim();
      // Only accept if it looks like a game name (not just a number or single word)
      if (gameName.length > 1 && !/^\d+$/.test(gameName)) {
        result.gameName = gameName;
        break;
      }
    }
  }

  // Determine transaction type based on text patterns (order matters - more specific first)
  // Manual balance changes should be detected BEFORE purchases/cashouts
  // Check for manual operations first (these don't have "successfully" prefix)
  if (cleanText.includes('deducted from your winning balance')) {
    result.type = 'winning_deducted';
  } else if (cleanText.includes('added to your winning balance')) {
    result.type = 'winning_added';
  } else if (cleanText.includes('deducted from your credit balance')) {
    result.type = 'credit_deducted';
  } else if (cleanText.includes('added to your credit balance')) {
    result.type = 'credit_added';
  } 
  // If it's a balance update type, don't treat as purchase/cashout
  else if (isBalanceUpdate) {
    // Already handled above, but if we get here, it's a balance update without specific text
    // Try to determine from context
    if (cleanText.includes('deducted') && cleanText.includes('winning')) {
      result.type = 'winning_deducted';
    } else if (cleanText.includes('added') && cleanText.includes('winning')) {
      result.type = 'winning_added';
    } else if (cleanText.includes('deducted') && cleanText.includes('credit')) {
      result.type = 'credit_deducted';
    } else if (cleanText.includes('added') && cleanText.includes('credit')) {
      result.type = 'credit_added';
    }
  }
  // Then check for frontend transactions (purchases/cashouts)
  else if (cleanText.includes('successfully purchased') || (cleanText.includes('purchased') && cleanText.includes('credit'))) {
    result.type = 'credit_purchase';
  } else if (cleanText.includes('successfully cashed out') || cleanText.includes('cashed out')) {
    result.type = 'cashout';
  } else if (cleanText.includes('successfully recharged') || cleanText.includes('recharged')) {
    result.type = 'recharge';
  } else if (cleanText.includes('successfully redeemed') || cleanText.includes('redeemed')) {
    result.type = 'redeem';
  }

  return result;
};

/**
 * Formats a transaction message according to the specified format
 */
export const formatTransactionMessage = (message: { text: string; userBalance?: string; winningBalance?: string; type?: string }): string => {
  const details = parseTransactionMessage(message.text, message.type);
  
  // Even if we can't determine the type, if we found credits and winnings, try to format it
  if (!details.type) {
    // Check if it already has the correct format (has "Credits:" and "Winnings:")
    const hasCorrectFormat = /credits?[:\s]*(?:<[^>]+>)*\$?[\d,]+\.?\d*/i.test(message.text) && 
                             /winnings?[:\s]*(?:<[^>]+>)*\$?[\d,]+\.?\d*/i.test(message.text);
    
    if (hasCorrectFormat && details.credits && details.winnings) {
      // Extract amount from the message
      let amount = details.amount;
      if (!amount) {
        const amountMatch = message.text.match(/<b>[\s\$]*([\d,]+\.?\d*)[\s\$]*<\/b>/i) || 
                           message.text.match(/\$([\d,]+\.?\d*)/);
        amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
      }
      
      // Try to determine type from text - prioritize manual operations
      const cleanText = stripHtml(message.text).toLowerCase();
      const isBalanceUpdate = message.type?.toLowerCase() === 'balanceupdated' || 
                              message.type?.toLowerCase() === 'balance_updated';
      let transactionType = '';
      
      // Check for manual operations first (these don't have "successfully" prefix)
      if (cleanText.includes('deducted from your winning balance')) {
        transactionType = 'winning_deducted';
      } else if (cleanText.includes('added to your winning balance')) {
        transactionType = 'winning_added';
      } else if (cleanText.includes('deducted from your credit balance')) {
        transactionType = 'credit_deducted';
      } else if (cleanText.includes('added to your credit balance')) {
        transactionType = 'credit_added';
      }
      // If it's a balance update type, don't treat as purchase/cashout
      else if (isBalanceUpdate) {
        // Already handled above, but if we get here, try to determine from context
        if (cleanText.includes('deducted') && cleanText.includes('winning')) {
          transactionType = 'winning_deducted';
        } else if (cleanText.includes('added') && cleanText.includes('winning')) {
          transactionType = 'winning_added';
        } else if (cleanText.includes('deducted') && cleanText.includes('credit')) {
          transactionType = 'credit_deducted';
        } else if (cleanText.includes('added') && cleanText.includes('credit')) {
          transactionType = 'credit_added';
        }
      }
      // Then check for frontend transactions
      else if (cleanText.includes('successfully purchased') || cleanText.includes('purchased credit')) {
        transactionType = 'credit_purchase';
      } else if (cleanText.includes('successfully cashed out') || cleanText.includes('cashed out')) {
        transactionType = 'cashout';
      } else if (cleanText.includes('successfully recharged') || cleanText.includes('recharged')) {
        transactionType = 'recharge';
      } else if (cleanText.includes('successfully redeemed') || cleanText.includes('redeemed')) {
        transactionType = 'redeem';
      }
      
      if (transactionType) {
        const formattedAmount = amount ? `$${amount}` : '$0';
        const formattedCredits = details.credits ? `$${details.credits}` : '$0';
        const formattedWinnings = details.winnings ? `$${details.winnings}` : '$0';
        const gameName = details.gameName || '';
        
        switch (transactionType) {
          case 'credit_purchase':
            return `You successfully purchased <b>${formattedAmount}</b> credit.\nCredits: <b>${formattedCredits}</b>\nWinnings: <b>${formattedWinnings}</b>`;
          case 'cashout':
            return `You successfully cashed out <b>${formattedAmount}</b>.\nCredits: <b>${formattedCredits}</b>\nWinnings: <b>${formattedWinnings}</b>`;
          case 'credit_added':
            return `<b>${formattedAmount}</b> added to your credit balance (<b>manual top-up</b>).\nCredits: <b>${formattedCredits}</b>\nWinnings: <b>${formattedWinnings}</b>`;
          case 'credit_deducted':
            return `<b>${formattedAmount}</b> deducted from your credit balance (<b>manual withdraw</b>).\nCredits: <b>${formattedCredits}</b>\nWinnings: <b>${formattedWinnings}</b>`;
          case 'winning_added':
            return `<b>${formattedAmount}</b> added to your winning balance (<b>manual top-up</b>).\nCredits: <b>${formattedCredits}</b>\nWinnings: <b>${formattedWinnings}</b>`;
          case 'winning_deducted':
            return `<b>${formattedAmount}</b> deducted from your winning balance (<b>manual withdraw</b>).\nCredits: <b>${formattedCredits}</b>\nWinnings: <b>${formattedWinnings}</b>`;
          case 'recharge':
            return `You successfully recharged <b>${formattedAmount}</b>${gameName ? ` to ${gameName}` : ''}.\nCredits: <b>${formattedCredits}</b>\nWinnings: <b>${formattedWinnings}</b>`;
          case 'redeem':
            return `You successfully redeemed <b>${formattedAmount}</b>${gameName ? ` from ${gameName}` : ''}.\nCredits: <b>${formattedCredits}</b>\nWinnings: <b>${formattedWinnings}</b>`;
        }
      }
    }
    
    // If not formatted correctly and we can't determine type, return original
    return message.text;
  }

  // Use parsed values, or try to extract from original text if parsing failed
  let amount = details.amount;
  if (!amount) {
    // Try to extract amount from original text
    const amountMatch = message.text.match(/\$?([\d,]+\.?\d*)/);
    amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
  }
  const formattedAmount = amount ? `$${amount}` : '$0';

  // Extract credits - prioritize: message object > parsed from text > fallback to '0'
  let credits = details.credits;
  if (!credits) {
    // Try to extract from message text
    const creditsMatch = message.text.match(/credits?[:\s]*\$?([\d,]+\.?\d*)/i);
    credits = creditsMatch ? creditsMatch[1].replace(/,/g, '') : null;
  }
  // If still no credits found, use userBalance from message object (most reliable)
  if (!credits && message.userBalance) {
    credits = String(message.userBalance).replace(/[$,]/g, '');
  }
  const formattedCredits = credits || '0';

  // Extract winnings - prioritize: message object > parsed from text > fallback to '0'
  let winnings = details.winnings;
  if (!winnings) {
    // Try to extract from message text
    const winningsMatch = message.text.match(/winnings?[:\s]*\$?([\d,]+\.?\d*)/i);
    winnings = winningsMatch ? winningsMatch[1].replace(/,/g, '') : null;
  }
  // If still no winnings found, use winningBalance from message object (most reliable)
  if (!winnings && message.winningBalance) {
    winnings = String(message.winningBalance).replace(/[$,]/g, '');
  }
  const formattedWinnings = winnings || '0';

  const gameName = details.gameName || '';

  let formattedText = '';

  switch (details.type) {
    case 'credit_purchase':
      formattedText = `You successfully purchased <b>${formattedAmount}</b> credit.\nCredits: <b>$${formattedCredits}</b>\nWinnings: <b>$${formattedWinnings}</b>`;
      break;
    case 'cashout':
      formattedText = `You successfully cashed out <b>${formattedAmount}</b>.\nCredits: <b>$${formattedCredits}</b>\nWinnings: <b>$${formattedWinnings}</b>`;
      break;
    case 'credit_added':
      formattedText = `<b>${formattedAmount}</b> added to your credit balance (<b>manual top-up</b>).\nCredits: <b>$${formattedCredits}</b>\nWinnings: <b>$${formattedWinnings}</b>`;
      break;
    case 'credit_deducted':
      formattedText = `<b>${formattedAmount}</b> deducted from your credit balance (<b>manual withdraw</b>).\nCredits: <b>$${formattedCredits}</b>\nWinnings: <b>$${formattedWinnings}</b>`;
      break;
    case 'winning_added':
      formattedText = `<b>${formattedAmount}</b> added to your winning balance (<b>manual top-up</b>).\nCredits: <b>$${formattedCredits}</b>\nWinnings: <b>$${formattedWinnings}</b>`;
      break;
    case 'winning_deducted':
      formattedText = `<b>${formattedAmount}</b> deducted from your winning balance (<b>manual withdraw</b>).\nCredits: <b>$${formattedCredits}</b>\nWinnings: <b>$${formattedWinnings}</b>`;
      break;
    case 'recharge':
      formattedText = `You successfully recharged <b>${formattedAmount}</b>${gameName ? ` to ${gameName}` : ''}.\nCredits: <b>$${formattedCredits}</b>\nWinnings: <b>$${formattedWinnings}</b>`;
      break;
    case 'redeem':
      formattedText = `You successfully redeemed <b>${formattedAmount}</b>${gameName ? ` from ${gameName}` : ''}.\nCredits: <b>$${formattedCredits}</b>\nWinnings: <b>$${formattedWinnings}</b>`;
      break;
    default:
      return message.text;
  }

  return formattedText;
};
