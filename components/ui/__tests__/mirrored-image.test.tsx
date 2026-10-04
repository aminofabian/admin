import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { MirroredImage } from '../mirrored-image';

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  ),
}));

const CLOUDINARY_BANNER =
  'https://res.cloudinary.com/dzlv4lat4/image/upload/v1700000000/banners/hero.png';
const R2_BANNER = 'https://pub-0dd4bbe75add476fa861bf35802ca3db.r2.dev/banners/hero.png';

describe('MirroredImage', () => {
  it('loads the R2 mirror first', () => {
    render(<MirroredImage src={CLOUDINARY_BANNER} alt="banner" width={10} height={10} />);
    expect(screen.getByAltText('banner').getAttribute('src')).toBe(R2_BANNER);
  });

  it('falls back to the original URL when the mirror fails', () => {
    const onError = vi.fn();
    render(
      <MirroredImage src={CLOUDINARY_BANNER} alt="banner" width={10} height={10} onError={onError} />,
    );
    fireEvent.error(screen.getByAltText('banner'));
    expect(screen.getByAltText('banner').getAttribute('src')).toBe(CLOUDINARY_BANNER);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports an error only after every source has failed', () => {
    const onError = vi.fn();
    render(
      <MirroredImage src={CLOUDINARY_BANNER} alt="banner" width={10} height={10} onError={onError} />,
    );
    fireEvent.error(screen.getByAltText('banner'));
    fireEvent.error(screen.getByAltText('banner'));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('uses non-Cloudinary URLs as they are', () => {
    const blobPreview = 'blob:https://admin.example/abc';
    const onError = vi.fn();
    render(
      <MirroredImage src={blobPreview} alt="preview" width={10} height={10} onError={onError} />,
    );
    expect(screen.getByAltText('preview').getAttribute('src')).toBe(blobPreview);
    fireEvent.error(screen.getByAltText('preview'));
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
