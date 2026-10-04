import { describe, it, expect } from 'vitest';
import { chatImageCandidates } from '../message-helpers';

const CHAT_CLOUDINARY =
  'https://res.cloudinary.com/dzlv4lat4/image/upload/v1710000000/chat/1710000000_abc.png';
const R2_FOR_CHAT =
  'https://pub-0dd4bbe75add476fa861bf35802ca3db.r2.dev/chat/1710000000_abc.png';
const BANNER_CLOUDINARY =
  'https://res.cloudinary.com/dzlv4lat4/image/upload/v1700000000/banners/hero.png';
const BANNER_R2 =
  'https://pub-0dd4bbe75add476fa861bf35802ca3db.r2.dev/banners/hero.png';

describe('chatImageCandidates', () => {
  it('uses the URL embedded in the text when there is no file field', () => {
    expect(chatImageCandidates({ text: CHAT_CLOUDINARY })).toEqual([
      CHAT_CLOUDINARY,
    ]);
  });

  it('keeps chat uploads on Cloudinary (no R2 twin)', () => {
    const candidates = chatImageCandidates({ text: CHAT_CLOUDINARY });
    expect(candidates).not.toContain(R2_FOR_CHAT);
  });

  it('falls back from a broken file field to the URL in the text', () => {
    // The regression: backend `file` 404s while the message text holds the URL
    // the upload actually returned. The old code tried only the first.
    const brokenFile = 'https://serverhub.biz/media/csr/chats/missing.png';
    const candidates = chatImageCandidates({
      fileUrl: brokenFile,
      text: `see this\n${CHAT_CLOUDINARY}`,
    });

    expect(candidates[0]).toBe(brokenFile);
    expect(candidates).toContain(CHAT_CLOUDINARY);
    expect(candidates.indexOf(CHAT_CLOUDINARY)).toBeGreaterThan(0);
  });

  it('offers migrated Cloudinary assets in both R2 and original form', () => {
    expect(chatImageCandidates({ text: BANNER_CLOUDINARY })).toEqual([
      BANNER_R2,
      BANNER_CLOUDINARY,
    ]);
  });

  it('ignores the text when the message is rendered as plain text', () => {
    expect(chatImageCandidates({ text: CHAT_CLOUDINARY, renderAsText: true })).toEqual(
      [],
    );
  });

  it('drops URLs that are not images', () => {
    const candidates = chatImageCandidates({
      fileUrl: 'https://serverhub.biz/media/csr/chats/statement.pdf',
      text: CHAT_CLOUDINARY,
    });
    expect(candidates).toEqual([CHAT_CLOUDINARY]);
  });

  it('dedupes when the file field and the text agree', () => {
    expect(
      chatImageCandidates({ fileUrl: CHAT_CLOUDINARY, text: CHAT_CLOUDINARY }),
    ).toEqual([CHAT_CLOUDINARY]);
  });
});
