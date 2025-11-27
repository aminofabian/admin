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
