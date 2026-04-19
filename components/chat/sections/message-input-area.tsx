'use client';

import { memo } from 'react';
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
  onClearImage,
  onAttachClick,
  onEmojiSelect,
  toggleEmojiPicker,
}: MessageInputAreaProps) {
  return (
    <div className="shrink-0 border-t border-border/40 bg-card/95 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.35)]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelect}
        className="hidden"
      />

      <div className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-4">
      {/* Image Preview */}
      {imagePreviewUrl && (
        <div className="mb-3 p-3 bg-muted/40 dark:bg-muted/60 rounded-xl border border-primary/20 dark:border-primary/30 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="relative group">
              <Image
                src={imagePreviewUrl}
                alt="Preview"
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded-lg"
                unoptimized
              />
              <button
                onClick={onClearImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
                aria-label="Remove image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selectedImage?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedImage && (selectedImage.size / 1024).toFixed(1)} KB
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-primary mt-1">READY TO SEND</p>
            </div>
          </div>
        </div>
      )}

      {/* Input Area - Creative: Send button inside textarea */}
      <div className="flex items-start gap-1.5 sm:gap-2 md:gap-2.5">
        {/* Textarea Container with Embedded Send Button */}
        <div className="relative min-w-0 flex-1">
          <textarea
            placeholder="Message… (Shift+Enter for line)"
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              // Auto-resize - responsive max height
              e.target.style.height = 'auto';
              const maxHeight = window.innerWidth >= 768 ? 300 : 160;
              e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + 'px';
            }}
            onKeyDown={onKeyPress}
            rows={1}
            className="w-full min-h-[52px] max-h-[160px] resize-none rounded-2xl border border-border/50 bg-background/90 py-2.5 pl-3 pr-3 text-sm leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 dark:border-border/70 dark:bg-input dark:placeholder:text-muted-foreground/70 md:min-h-[100px] md:max-h-[300px] md:px-5 md:py-4 md:pr-5 md:pb-14 md:text-base lg:min-h-[120px] lg:px-6 lg:py-5 lg:text-lg pb-[3.25rem] md:pb-14"
            aria-label="Type a message"
          />
          
          {/* Action Bar - Inside Textarea at Bottom */}
          <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between gap-1 md:bottom-3 md:left-4 md:right-4 md:gap-2">
            {/* Left: Quick Actions */}
            <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1">
              <button 
                onClick={onAttachClick}
                type="button"
                className="shrink-0 touch-manipulation rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95 md:p-2"
                title="Attach image"
                aria-label="Attach image"
                disabled={isUploadingImage}
              >
                <svg className="h-4 w-4 md:h-[18px] md:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <div className="relative">
                <button 
                  onClick={toggleEmojiPicker}
                  type="button"
                  className="shrink-0 touch-manipulation rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95 md:p-2"
                  title="Emoji"
                  aria-label="Add emoji"
                >
                  <svg className="h-4 w-4 md:h-[18px] md:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    className="absolute bottom-full left-0 mb-2 bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-xl p-3 z-50 w-64 max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-foreground">PICK AN EMOJI</span>
                      <button 
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                      {commonEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => onEmojiSelect(emoji)}
                          className="text-xl hover:bg-muted rounded p-1 transition-colors active:scale-95 hover:scale-110"
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
                  className="shrink-0 touch-manipulation rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500 active:scale-95 md:p-2"
                  aria-label="Clear message"
                >
                  <svg className="h-4 w-4 md:h-[18px] md:w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Right: Send — icon + label on small screens for clarity */}
            <button
              onClick={onSendMessage}
              type="button"
              disabled={(!messageInput.trim() && !selectedImage) || isUploadingImage}
              className="flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-1 rounded-xl bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/15 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-40 disabled:hover:scale-100 sm:gap-1.5 sm:px-3 sm:text-sm md:min-h-0 md:px-5 md:py-2.5 lg:px-6"
              aria-label="Send message"
            >
              {isUploadingImage ? (
                <>
                  <svg className="h-5 w-5 shrink-0 animate-spin md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                    <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  <span className="max-w-[4.5rem] truncate sm:max-w-none">Sending…</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-semibold sm:text-xs md:text-sm md:uppercase md:tracking-wide">
                    Send
                  </span>
                  <svg className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile hint — own row + generous bottom inset so it is not clipped by home indicator / overflow */}
      <div className="border-t border-border/20 bg-card/95 px-3 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pt-1.5 text-center text-[11px] leading-snug text-muted-foreground/80 md:hidden">
        Enter to send · Shift+Enter for new line
      </div>
    </div>
  );
});
