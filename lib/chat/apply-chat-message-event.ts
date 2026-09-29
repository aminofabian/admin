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

/** Match the numeric ids in the websocket examples when the value is a safe integer. */
export function socketNumericId(value: string | number): number | string {
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return raw;
  const asNumber = Number(raw);
  return Number.isSafeInteger(asNumber) ? asNumber : raw;
}

export interface MessageEditedSocketEvent {
  type: "message_edited";
  id: number | string;
  message_id: number | string;
  chatroom_id?: number | string;
  player_id: number;
  is_comment: boolean;
  message: string;
}

export interface MessageDeletedSocketEvent {
  type: "message_deleted";
  id: number | string;
  message_id: number | string;
  chatroom_id?: number | string;
  player_id: number;
  is_comment: boolean;
}

function withRoom<T extends { chatroom_id?: number | string }>(
  event: T,
  chatroomId?: string | number | null,
): T {
  if (chatroomId == null || String(chatroomId).trim() === "") return event;
  return { ...event, chatroom_id: socketNumericId(chatroomId) };
}

export function buildMessageEditedEvent(input: {
  messageId: string;
  message: string;
  playerId: number;
  chatroomId?: string | number | null;
  isComment?: boolean;
}): MessageEditedSocketEvent {
  const id = socketNumericId(input.messageId);
  return withRoom(
    {
      type: "message_edited",
      id,
      message_id: id,
      player_id: input.playerId,
      is_comment: Boolean(input.isComment),
      message: input.message,
    },
    input.chatroomId,
  );
}

export function buildMessageDeletedEvent(input: {
  messageId: string;
  playerId: number;
  chatroomId?: string | number | null;
  isComment?: boolean;
}): MessageDeletedSocketEvent {
  const id = socketNumericId(input.messageId);
  return withRoom(
    {
      type: "message_deleted",
      id,
      message_id: id,
      player_id: input.playerId,
      is_comment: Boolean(input.isComment),
    },
    input.chatroomId,
  );
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
