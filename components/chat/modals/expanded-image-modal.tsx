'use client';

import { useEffect } from 'react';
import Image from 'next/image';

interface ExpandedImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ExpandedImageModal({
  imageUrl,
  onClose,
}: ExpandedImageModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!imageUrl) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        onClick={onClose}
        title="Close (ESC)"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Download button */}
      <a
        href={imageUrl}
        download
        className="absolute top-4 right-16 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        onClick={(e) => e.stopPropagation()}
        title="Download image"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>

      {/* Expanded image */}
      <Image
        src={imageUrl}
        alt="Expanded view"
        width={1200}
        height={800}
        className="max-w-full max-h-full object-contain"
        unoptimized
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
