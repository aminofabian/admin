import { describe, expect, it } from 'vitest';
import { buildR2ObjectKey } from '../build-r2-object-key';

const NOW = 1710000000000;
const fixedSuffix = () => 'abc123';

describe('buildR2ObjectKey', () => {
  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/gif', 'gif'],
    ['image/webp', 'webp'],
  ])('maps %s to .%s under the folder', (mime, extension) => {
    expect(buildR2ObjectKey('chat', mime, NOW, fixedSuffix)).toBe(
      `chat/${NOW}_abc123.${extension}`,
    );
  });

  it('strips surrounding slashes from the folder', () => {
    expect(buildR2ObjectKey('/chat/', 'image/png', NOW, fixedSuffix)).toBe(
      `chat/${NOW}_abc123.png`,
    );
  });

  it('rejects types outside the image allowlist', () => {
    expect(() => buildR2ObjectKey('chat', 'image/svg+xml', NOW, fixedSuffix)).toThrow();
  });

  it('generates distinct random suffixes by default', () => {
    expect(buildR2ObjectKey('chat', 'image/png', NOW)).not.toBe(
      buildR2ObjectKey('chat', 'image/png', NOW),
    );
  });
});
