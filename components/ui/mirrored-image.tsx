'use client';

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import Image, { type ImageProps } from 'next/image';
import { toR2ImageUrl } from '@/lib/utils/media-url';

type MirroredImageProps = Omit<ImageProps, 'src'> & { src: string };

/**
 * next/image that loads the R2 mirror of a Cloudinary URL first and the
 * original second. Images uploaded after the last mirror sync exist only on
 * Cloudinary. `onError` fires only once every source has failed.
 */
export function MirroredImage({ src, onError, alt, ...imageProps }: MirroredImageProps) {
  const sources = useMemo(() => [...new Set([toR2ImageUrl(src), src])].filter(Boolean), [src]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => setSourceIndex(0), [sources]);

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    if (sourceIndex + 1 < sources.length) {
      setSourceIndex(sourceIndex + 1);
      return;
    }
    onError?.(event);
  };

  return (
    <Image
      {...imageProps}
      alt={alt}
      src={sources[sourceIndex] ?? src}
      onError={handleError}
    />
  );
}
