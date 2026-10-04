import { describe, it, expect } from 'vitest';
import { toR2ImageUrl } from '../media-url';

describe('toR2ImageUrl', () => {
  it('leaves non-Cloudinary URLs unchanged', () => {
    expect(toR2ImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(toR2ImageUrl('')).toBe('');
    expect(toR2ImageUrl(null)).toBe('');
  });

  it('rewrites migrated Cloudinary assets to R2', () => {
    expect(
      toR2ImageUrl(
        'https://res.cloudinary.com/dzlv4lat4/image/upload/v1700000000/banners/hero.png',
      ),
    ).toBe('https://pub-0dd4bbe75add476fa861bf35802ca3db.r2.dev/banners/hero.png');
  });

  it('strips Cloudinary transforms before rewriting', () => {
    expect(
      toR2ImageUrl(
        'https://res.cloudinary.com/dzlv4lat4/image/upload/w_400,c_fill/v1/logo/mark.png',
      ),
    ).toBe('https://pub-0dd4bbe75add476fa861bf35802ca3db.r2.dev/logo/mark.png');
  });

  it('keeps chat uploads on Cloudinary (not mirrored to R2)', () => {
    const chatUrl =
      'https://res.cloudinary.com/dzlv4lat4/image/upload/v1710000000/chat/1710000000_abc.jpg';
    expect(toR2ImageUrl(chatUrl)).toBe(chatUrl);
  });
});
