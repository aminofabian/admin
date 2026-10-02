import { describe, it, expect } from 'vitest';
import { sniffImageMime, validateUploadedImage } from '../image-upload-validation';

function fileOf(bytes: number[], type = 'image/png', name = 'x.png'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const GIF87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

/** Narrow a SniffResult to its success branch, failing loudly otherwise. */
async function mimeOf(file: File): Promise<string> {
  const result = await sniffImageMime(file);
  if (!result.ok) throw new Error(`expected a recognised image, got: ${result.reason}`);
  return result.mime;
}

describe('sniffImageMime', () => {
  it('identifies the formats an operator can actually send', async () => {
    expect(await mimeOf(fileOf(PNG))).toBe('image/png');
    expect(await mimeOf(fileOf(JPEG))).toBe('image/jpeg');
    expect(await mimeOf(fileOf(GIF87))).toBe('image/gif');
    expect(await mimeOf(fileOf(GIF89))).toBe('image/gif');
    expect(await mimeOf(fileOf(WEBP))).toBe('image/webp');
  });

  it('rejects an SVG even when it is declared as an image', async () => {
    // SVG is XML that can carry script and is served same-origin as the chat.
    const svg = [0x3c, 0x3f, 0x78, 0x6d, 0x6c, 0x20]; // "<?xml "
    const result = await sniffImageMime(fileOf(svg, 'image/svg+xml', 'x.svg'));
    expect(result.ok).toBe(false);
  });

  it('rejects an HTML document disguised as an image', async () => {
    const html = [0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e]; // "<html>"
    const result = await sniffImageMime(fileOf(html, 'image/png', 'x.png'));
    expect(result.ok).toBe(false);
  });

  it('rejects arbitrary bytes', async () => {
    const result = await sniffImageMime(fileOf([0x00, 0x01, 0x02, 0x03], 'image/png'));
    expect(result.ok).toBe(false);
  });
});

describe('validateUploadedImage', () => {
  it('accepts a genuine image', async () => {
    const result = await validateUploadedImage(fileOf(PNG, 'image/png'));
    expect(result.ok).toBe(true);
  });

  it('accepts a genuine image with an empty declared type', async () => {
    // Some clients omit Content-Type; the bytes are what matter.
    const result = await validateUploadedImage(fileOf(PNG, ''));
    expect(result.ok).toBe(true);
  });

  it('rejects a non-image whose declared type claims to be an image', async () => {
    // The exact bypass of a `file.type.startsWith('image/')` check.
    const payload = [...Buffer.from('%PDF-1.4\n1 0 obj')];
    const result = await validateUploadedImage(fileOf(payload, 'image/png', 'x.png'));
    expect(result.ok).toBe(false);
  });

  it('rejects a declared type that disagrees with the content', async () => {
    const result = await validateUploadedImage(fileOf(PNG, 'image/jpeg', 'x.jpg'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/does not match/i);
  });

  it('rejects an empty file', async () => {
    const result = await validateUploadedImage(new File([], 'empty.png', { type: 'image/png' }));
    expect(result.ok).toBe(false);
  });
});
