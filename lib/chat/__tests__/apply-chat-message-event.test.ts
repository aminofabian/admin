import { describe, expect, it } from "vitest";
import {
  applyMessageDeleted,
  applyMessageEdited,
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
