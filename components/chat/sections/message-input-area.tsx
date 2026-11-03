'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

interface MessageInputAreaProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  selectedImage: File | null;
  imagePreviewUrl: string | null;
  isUploadingImage: boolean;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (value: boolean) => void;
  commonEmojis: string[];
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Conversation identifier; changing it moves focus into the composer. */
  focusKey?: number | string | null;
  /** Shown in the placeholder so the agent knows who they are replying to. */
  recipientName?: string;
  onClearImage: () => void;
  onAttachClick: () => void;
  onEmojiSelect: (emoji: string) => void;
  toggleEmojiPicker: () => void;
}

export const MessageInputArea = memo(function MessageInputArea({
  messageInput,
  setMessageInput,
  selectedImage,
  imagePreviewUrl,
  isUploadingImage,
  showEmojiPicker,
  setShowEmojiPicker,
  commonEmojis,
  emojiPickerRef,
  fileInputRef,
  onSendMessage,
  onKeyPress,
  onImageSelect,
  focusKey,
  recipientName,
  onClearImage,
  onAttachClick,
  onEmojiSelect,
  toggleEmojiPicker,
}: MessageInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = window.innerWidth >= 768 ? 300 : 160;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  // Keep the textarea's height in sync with its content. Driving it from an
  // effect (rather than only on keydown) means it also shrinks after a send,
  // after clearing, and when a multi-line draft is restored for another chat —
  // otherwise the empty composer stayed as tall as the last message.
  useEffect(() => {
    resizeTextarea();
  }, [messageInput, focusKey, resizeTextarea]);

  // Opening (or switching) a conversation should leave the caret ready to
  // type. Touch devices are excluded: focusing there pops the keyboard over
  // the transcript before the agent has read it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    textareaRef.current?.focus({ preventScroll: true });
  }, [focusKey]);

  // Keep the caret in the composer after a click on Send, so a reply thread
  // does not require re-clicking the field between messages.
  const focusComposer = () => {
    textareaRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="shrink-0 border-t border-border/50 bg-card/95 px-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] pt-2.5 backdrop-blur-md sm:px-5 md:px-6 md:py-3 lg:pb-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelect}
        className="hidden"
      />

      <div className="mx-auto w-full max-w-[58rem]">
        {/* Image Preview */}
        {imagePreviewUrl && (
          <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-2.5">
            <div className="group relative shrink-0">
              <Image
                src={imagePreviewUrl}
                alt="Preview"
                width={64}
                height={64}
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-border/50"
                unoptimized
              />
              <button
                onClick={onClearImage}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/90 text-white shadow-md transition-colors hover:bg-red-500"
                aria-label="Remove image"
                type="button"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">{selectedImage?.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {selectedImage && (selectedImage.size / 1024).toFixed(1)} KB
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-primary">Ready to send</p>
            </div>
          </div>
        )}

        {/* Composer surface */}
        <div className="rounded-2xl border border-border/60 bg-background shadow-sm transition-all duration-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
          <textarea
            ref={textareaRef}
            placeholder={recipientName ? `Message ${recipientName}…` : 'Write a message…'}
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              // Resize before paint so growing text never jitters a frame.
              resizeTextarea();
            }}
            onKeyDown={onKeyPress}
            enterKeyHint="send"
            rows={1}
            // Read-only during upload so the caption cannot change mid-request
            // (the caption is read after the upload resolves).
            readOnly={isUploadingImage}
            className="block max-h-[160px] min-h-[46px] w-full resize-none rounded-t-2xl border-0 bg-transparent px-3.5 pb-1 pt-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none md:max-h-[300px] md:px-4 md:text-[15px]"
            aria-label="Type a message"
          />

          <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-0.5 md:px-2.5 md:pb-2">
            {/* Left: quick actions */}
            <div className="flex min-w-0 items-center gap-0.5">
              <button
                onClick={onAttachClick}
                type="button"
                className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95 disabled:opacity-40"
                title="Attach image"
                aria-label="Attach image"
                disabled={isUploadingImage}
              >
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              <div className="relative">
                <button
                  onClick={toggleEmojiPicker}
                  type="button"
                  className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
                  title="Emoji"
                  aria-label="Add emoji"
                >
                  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-full left-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] animate-in rounded-2xl border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur-md fade-in zoom-in-95 duration-200"
                  >
                    <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">Pick an emoji</span>
                      <button
                        onClick={() => setShowEmojiPicker(false)}
                        type="button"
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Close emoji picker"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
                      {commonEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => onEmojiSelect(emoji)}
                          type="button"
                          className="rounded-lg p-1 text-xl transition-transform hover:scale-110 hover:bg-muted active:scale-95"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {messageInput && (
                <button
                  onClick={() => setMessageInput('')}
                  type="button"
                  className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 active:scale-95"
                  aria-label="Clear message"
                >
                  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Right: hint + send */}
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden select-none text-[10px] text-muted-foreground/70 lg:inline">
                Shift + Enter for a new line
              </span>
              <button
                onClick={() => {
                  onSendMessage();
                  focusComposer();
                }}
                type="button"
                disabled={(!messageInput.trim() && !selectedImage) || isUploadingImage}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground/70 disabled:shadow-none"
                aria-label="Send message"
              >
                {isUploadingImage ? (
                  <>
                    <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    <span>Sending…</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
