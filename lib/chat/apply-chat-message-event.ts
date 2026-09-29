const imageUrlPattern = () =>
  /https?:\/\/[^\s<>"]+\.(jpg|jpeg|png|gif|bmp|webp|svg)/gi;

export interface ChatEventMessage {
  id: string;
  text: string;
  timestamp: string;
  fileUrl?: string;
  isFile?: boolean;
  isPinned?: boolean;
  renderAsText?: boolean;
  /** Exit animation in progress; message will be removed shortly. */
  isDissipating?: boolean;
}

/** How long the delete exit animation plays before the row is removed. */
export const MESSAGE_DISSIPATE_MS = 720;

export function messageEventId(event: {
  id?: string | number | null;
  message_id?: string | number | null;
}): string | null {
  const raw = event.message_id ?? event.id;
  if (raw == null || raw === "") return null;
  return String(raw);
}

/** Match the numeric ids in the websocket examples when the value is a safe integer. */
export function socketNumericId(value: string | number): number | string {
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return raw;
  const asNumber = Number(raw);
  return Number.isSafeInteger(asNumber) ? asNumber : raw;
}

/** Outbound command the admin dashboard sends to edit a message. */
export interface EditMessageCommand {
  type: "edit_message";
  message_id: number | string;
  message: string;
}

/** Outbound command the admin dashboard sends to delete a message. */
export interface DeleteMessageCommand {
  type: "delete_message";
  message_id: number | string;
}

export function buildMessageEditedEvent(input: {
  messageId: string;
  message: string;
}): EditMessageCommand {
  return {
    type: "edit_message",
    message_id: socketNumericId(input.messageId),
    message: input.message,
  };
}

export function buildMessageDeletedEvent(input: {
  messageId: string;
}): DeleteMessageCommand {
  return {
    type: "delete_message",
    message_id: socketNumericId(input.messageId),
  };
}

function plainPreviewText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function conversationPreviewText(
  message: ChatEventMessage | undefined,
): string {
  if (!message) return "";
  const withoutImages = plainPreviewText(message.text).replace(
    imageUrlPattern(),
    "",
  );
  const caption = withoutImages.replace(/\n{2,}/g, "\n").trim();
  if (caption) return caption;
  if (
    message.fileUrl ||
    message.isFile ||
    imageUrlPattern().test(message.text || "")
  ) {
    return "📷 Image";
  }
  return plainPreviewText(message.text);
}

/** Caption an admin can edit, with the image URLs that must survive the edit. */
export function splitEditableMessageText(text: string): {
  caption: string;
  imageUrls: string[];
} {
  const imageUrls = Array.from(
    new Set((text || "").match(imageUrlPattern()) ?? []),
  );
  const caption = plainPreviewText(text || "")
    .replace(imageUrlPattern(), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { caption, imageUrls };
}

export function composeEditedMessageText(
  caption: string,
  imageUrls: string[],
): string {
  return [caption.trim(), ...imageUrls].filter(Boolean).join("\n");
}

function previewOf(message: ChatEventMessage | undefined): {
  text: string;
  timestamp: string;
} {
  if (!message) return { text: "", timestamp: "" };
  return {
    text: conversationPreviewText(message),
    timestamp: message.timestamp,
  };
}

export function applyMessageEdited<T extends ChatEventMessage>(
  messages: T[],
  messageId: string,
  text: string,
): { messages: T[]; preview: { text: string; timestamp: string } | null } {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index === -1) return { messages, preview: null };

  const next = messages.map((message) =>
    message.id === messageId
      ? { ...message, text, renderAsText: true }
      : message,
  );
  const isLast = index === messages.length - 1;
  return {
    messages: next,
    preview: isLast ? previewOf(next[next.length - 1]) : null,
  };
}

export function applyMessageDeleted<T extends ChatEventMessage>(
  messages: T[],
  messageId: string,
): { messages: T[]; preview: { text: string; timestamp: string } | null } {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index === -1) return { messages, preview: null };

  const next = messages.filter((message) => message.id !== messageId);
  const isLast = index === messages.length - 1;
  if (!isLast) return { messages: next, preview: null };
  return { messages: next, preview: previewOf(next[next.length - 1]) };
}

/**
 * Marks a message for the evaporate exit animation and returns the
 * conversation preview as if the message were already gone.
 */
export function markMessageDissipating<T extends ChatEventMessage>(
  messages: T[],
  messageId: string,
): { messages: T[]; preview: { text: string; timestamp: string } | null } {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index === -1) return { messages, preview: null };
  if (messages[index].isDissipating) {
    return { messages, preview: null };
  }

  const next = messages.map((message) =>
    message.id === messageId ? { ...message, isDissipating: true } : message,
  );
  const remaining = next.filter((message) => message.id !== messageId);
  const isLast = index === messages.length - 1;
  return {
    messages: next,
    preview: isLast ? previewOf(remaining[remaining.length - 1]) : null,
  };
}
