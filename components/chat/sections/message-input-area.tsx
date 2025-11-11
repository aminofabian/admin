'use client';

import { memo } from 'react';

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
    <div className="px-4 py-3 md:px-6 md:py-4 border-t border-border/50 bg-gradient-to-t from-card via-card/95 to-card/90 backdrop-blur-sm sticky bottom-0 shadow-lg">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageSelect}
        className="hidden"
      />

      {/* Image Preview */}
      {imagePreviewUrl && (
        <div className="mb-3 p-3 bg-muted/30 rounded-xl border-2 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="relative group">
              <img
                src={imagePreviewUrl}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg"
              />
              <button
                onClick={onClearImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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
              <p className="text-xs text-primary mt-1">Ready to send</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar - Desktop Only */}
      <div className="hidden lg:flex items-center gap-1 mb-2 pb-2 border-border/30">
        <button 
          onClick={onAttachClick}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="Attach image"
          disabled={isUploadingImage}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button 
          onClick={toggleEmojiPicker}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="Emoji"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-muted/50 rounded border border-border/50 text-[10px]">Shift + Enter</kbd>
          <span className="text-[10px]">for new line</span>
        </div>
      </div>

      {/* Input Area - Creative: Send button inside textarea */}
      <div className="flex items-start gap-2 md:gap-2.5">
        {/* Mobile: Show attach button */}
        <button 
          onClick={onAttachClick}
          className="md:hidden p-2.5 mt-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-95 flex-shrink-0"
          title="Attach image"
          aria-label="Attach image"
          disabled={isUploadingImage}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        
        {/* Textarea Container with Embedded Send Button */}
        <div className="flex-1 relative">
          <textarea
            placeholder="Type your message... (Shift+Enter for new line)"
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              // Auto-resize - responsive max height
              e.target.style.height = 'auto';
              const maxHeight = window.innerWidth >= 768 ? 300 : 200;
              e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + 'px';
            }}
            onKeyDown={onKeyPress}
            rows={1}
            className="w-full min-h-[80px] md:min-h-[140px] lg:min-h-[160px] max-h-[200px] md:max-h-[300px] rounded-2xl bg-background/80 dark:bg-background border-2 border-border/50 focus:border-primary transition-all text-sm md:text-base lg:text-lg py-3 md:py-4 lg:py-5 px-4 md:px-5 lg:px-6 pr-16 md:pr-20 pb-14 md:pb-16 shadow-md resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 text-foreground leading-relaxed"
          />
          
          {/* Action Bar - Inside Textarea at Bottom */}
          <div className="absolute bottom-2 md:bottom-3 left-3 right-3 md:left-4 md:right-4 flex items-center justify-between gap-2">
            {/* Left: Quick Actions */}
            <div className="flex items-center gap-1">
              <button 
                onClick={onAttachClick}
                className="p-1.5 md:p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-95"
                title="Attach image"
                aria-label="Attach image"
                disabled={isUploadingImage}
              >
                <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <div className="relative">
                <button 
                  onClick={toggleEmojiPicker}
                  className="p-1.5 md:p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-95"
                  title="Emoji"
                  aria-label="Add emoji"
                >
                  <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-xl p-3 z-50 w-64 animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">Pick an emoji</span>
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
                  className="p-1.5 md:p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-95"
                  aria-label="Clear message"
                >
                  <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Right: Send Button */}
            <button
              onClick={onSendMessage}
              disabled={(!messageInput.trim() && !selectedImage) || isUploadingImage}
              className="rounded-xl px-4 md:px-5 lg:px-6 py-2 md:py-2.5 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground font-semibold text-sm md:text-base"
              aria-label="Send message"
            >
              {isUploadingImage ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                    <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <svg className="w-4.5 h-4.5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile hint */}
      <div className="md:hidden mt-2 text-xs text-muted-foreground/60 text-center">
        Tap Send or Enter to send • Hold Shift for new line
      </div>
    </div>
  );
});
