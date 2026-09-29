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
}

export function messageEventId(event: {
  id?: string | number | null;
  message_id?: string | number | null;
}): string | null {
  const raw = event.message_id ?? event.id;
  if (raw == null || raw === "") return null;
  return String(raw);
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
