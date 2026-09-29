import { describe, expect, it } from "vitest";
import {
  applyMessageDeleted,
  applyMessageEdited,
  buildMessageDeletedEvent,
  buildMessageEditedEvent,
  messageEventId,
} from "../apply-chat-message-event";
import type { ChatEventMessage } from "../apply-chat-message-event";

function message(
  partial: Partial<ChatEventMessage> & Pick<ChatEventMessage, "id" | "text">,
): ChatEventMessage {
  return {
    timestamp: "2026-09-29T12:00:00.000Z",
    ...partial,
  };
}

describe("messageEventId", () => {
  it("prefers message_id over id", () => {
    expect(messageEventId({ id: 1, message_id: 125 })).toBe("125");
  });
});

describe("websocket edit and delete payloads", () => {
  it("sends message_edited with the same fields as the socket example", () => {
    expect(
      buildMessageEditedEvent({
        messageId: "125",
        message: "Hello! Your request has been approved.",
        chatroomId: "10",
        playerId: 42,
        isComment: false,
      }),
    ).toEqual({
      type: "message_edited",
      id: 125,
      message_id: 125,
      chatroom_id: 10,
      player_id: 42,
      is_comment: false,
      message: "Hello! Your request has been approved.",
    });
  });

  it("sends message_deleted without a message body", () => {
    expect(
      buildMessageDeletedEvent({
        messageId: "125",
        chatroomId: 10,
        playerId: 42,
        isComment: false,
      }),
    ).toEqual({
      type: "message_deleted",
      id: 125,
      message_id: 125,
      chatroom_id: 10,
      player_id: 42,
      is_comment: false,
    });
  });
});

describe("applyMessageEdited", () => {
  const messages = [
    message({ id: "1", text: "older" }),
    message({
      id: "125",
      text: "Hello",
      isPinned: true,
      timestamp: "2026-09-29T12:05:00.000Z",
    }),
  ];

  it("replaces the existing message text and does not add a bubble", () => {
    const result = applyMessageEdited(
      messages,
      "125",
      "Hello! Your request has been approved.",
    );
    expect(result.messages).toHaveLength(2);
    expect(result.messages[1]).toMatchObject({
      id: "125",
      text: "Hello! Your request has been approved.",
      renderAsText: true,
      isPinned: true,
    });
  });

  it("updates the last-message preview only when the latest message changes", () => {
    const editedLast = applyMessageEdited(messages, "125", "Approved");
    expect(editedLast.preview).toEqual({
      text: "Approved",
      timestamp: "2026-09-29T12:05:00.000Z",
    });

    const editedOlder = applyMessageEdited(messages, "1", "still older");
    expect(editedOlder.preview).toBeNull();
    expect(editedOlder.messages[1].text).toBe("Hello");
  });

  it("leaves the thread unchanged when the message is not loaded", () => {
    const result = applyMessageEdited(messages, "999", "nope");
    expect(result.messages).toBe(messages);
    expect(result.preview).toBeNull();
  });

  it("uses the caption, not the image url, as the preview", () => {
    const result = applyMessageEdited(
      [message({ id: "2", text: "see this", fileUrl: "https://cdn.example.com/a.jpg", isFile: true })],
      "2",
      "see this\nhttps://cdn.example.com/a.jpg",
    );
    expect(result.preview?.text).toBe("see this");
  });
});

describe("sample websocket payloads", () => {
  const thread = [
    message({ id: "10", text: "Earlier note", timestamp: "2026-09-29T11:00:00.000Z" }),
    message({
      id: "125",
      text: "Hello",
      isPinned: true,
      timestamp: "2026-09-29T11:32:00.000Z",
    }),
  ];

  const edited = {
    type: "message_edited",
    id: 125,
    message_id: 125,
    chatroom_id: 10,
    player_id: 42,
    is_comment: false,
    message: "Hello! Your request has been approved.",
  };

  const deleted = {
    type: "message_deleted",
    id: 125,
    message_id: 125,
    chatroom_id: 10,
    player_id: 42,
    is_comment: false,
  };

  it("edits message 125 in place and marks the text for safe rendering", () => {
    const id = messageEventId(edited);
    const result = applyMessageEdited(thread, id!, edited.message);
    expect(result.messages).toHaveLength(thread.length);
    expect(result.messages.map((item) => item.id)).toEqual(["10", "125"]);
    expect(result.messages[1].text).toBe(
      "Hello! Your request has been approved.",
    );
    expect(result.messages[1].renderAsText).toBe(true);
    expect(result.messages[1].isPinned).toBe(true);
    expect(result.preview?.text).toBe(
      "Hello! Your request has been approved.",
    );
  });

  it("keeps edited HTML as literal text instead of markup", () => {
    const hostile = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const result = applyMessageEdited(thread, "125", hostile);
    expect(result.messages[1].text).toBe(hostile);
    expect(result.messages[1].renderAsText).toBe(true);
    expect(result.preview?.text).not.toContain("<script>");
    expect(result.preview?.text).not.toContain("<img");
  });

  it("deletes message 125 from the thread and from pinned messages", () => {
    const id = messageEventId(deleted);
    const result = applyMessageDeleted(thread, id!);
    expect(result.messages.map((item) => item.id)).toEqual(["10"]);
    expect(result.messages.some((item) => item.isPinned)).toBe(false);
    expect(result.preview).toEqual({
      text: "Earlier note",
      timestamp: "2026-09-29T11:00:00.000Z",
    });
  });

  it("does not create a bubble when the id is not in the thread", () => {
    expect(applyMessageEdited(thread, "999", edited.message).messages).toBe(
      thread,
    );
    expect(applyMessageDeleted(thread, "999").messages).toBe(thread);
  });
});

describe("applyMessageDeleted", () => {
  const messages = [
    message({ id: "1", text: "kept" }),
    message({
      id: "125",
      text: "gone",
      isPinned: true,
      timestamp: "2026-09-29T12:05:00.000Z",
    }),
  ];

  it("removes the message from the conversation and from pinned messages", () => {
    const result = applyMessageDeleted(messages, "125");
    expect(result.messages.map((item) => item.id)).toEqual(["1"]);
    expect(result.messages.some((item) => item.isPinned)).toBe(false);
    expect(result.preview).toEqual({
      text: "kept",
      timestamp: "2026-09-29T12:00:00.000Z",
    });
  });

  it("does not change the preview when an older message is removed", () => {
    const result = applyMessageDeleted(messages, "1");
    expect(result.messages.map((item) => item.id)).toEqual(["125"]);
    expect(result.preview).toBeNull();
  });

  it("clears the preview when the only message is deleted", () => {
    const result = applyMessageDeleted(
      [message({ id: "125", text: "only" })],
      "125",
    );
    expect(result.messages).toEqual([]);
    expect(result.preview).toEqual({ text: "", timestamp: "" });
  });
});
