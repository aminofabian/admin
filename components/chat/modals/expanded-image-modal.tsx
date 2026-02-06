'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Download, X } from 'lucide-react';

interface ExpandedImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ExpandedImageModal({
  imageUrl,
  onClose,
}: ExpandedImageModalProps) {
  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    const filename = `chat-image-${Date.now()}.png`;
    try {
      const res = await fetch(imageUrl, { mode: 'cors' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [imageUrl]);

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
      {/* Action buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          title="Download image"
        >
          <Download className="w-6 h-6" />
        </button>
        <button
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Close (ESC)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

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
