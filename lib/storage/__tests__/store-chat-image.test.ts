// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readR2UploadConfig: vi.fn(),
  uploadImageToR2: vi.fn(),
  isCloudinaryConfigured: vi.fn(),
  uploadToCloudinary: vi.fn(),
}));

vi.mock('../read-r2-upload-config', () => ({ readR2UploadConfig: mocks.readR2UploadConfig }));
vi.mock('../upload-image-to-r2', () => ({ uploadImageToR2: mocks.uploadImageToR2 }));
vi.mock('@/lib/utils/cloudinary', () => ({
  isCloudinaryConfigured: mocks.isCloudinaryConfigured,
  uploadToCloudinary: mocks.uploadToCloudinary,
}));

import { storeChatImage } from '../store-chat-image';

const R2_READY = { status: 'ready', config: { publicBaseUrl: 'https://media.example.com' } };
const CLOUDINARY_URL = 'https://res.cloudinary.com/demo/image/upload/v1/chat/x.png';
const pngFile = () => new File([new Uint8Array([0x89, 0x50])], 'x.png', { type: 'image/png' });

describe('storeChatImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.uploadToCloudinary.mockResolvedValue({ secure_url: CLOUDINARY_URL, public_id: 'chat/x' });
  });

  it('uploads to R2 under chat/ when R2 is ready', async () => {
    mocks.readR2UploadConfig.mockReturnValue(R2_READY);
    mocks.isCloudinaryConfigured.mockReturnValue(true);
    mocks.uploadImageToR2.mockImplementation(async (_config, image) => `https://media.example.com/${image.key}`);

    const stored = await storeChatImage(pngFile(), 'image/png');

    expect(stored?.storage).toBe('r2');
    expect(stored?.filename).toMatch(/^chat\/\d+_[0-9a-f]+\.png$/);
    expect(stored?.url).toBe(`https://media.example.com/${stored?.filename}`);
    expect(mocks.uploadToCloudinary).not.toHaveBeenCalled();
  });

  it('falls back to Cloudinary when the R2 upload fails', async () => {
    mocks.readR2UploadConfig.mockReturnValue(R2_READY);
    mocks.isCloudinaryConfigured.mockReturnValue(true);
    mocks.uploadImageToR2.mockRejectedValue(new Error('R2 down'));

    const stored = await storeChatImage(pngFile(), 'image/png');

    expect(stored).toEqual({ url: CLOUDINARY_URL, filename: 'chat/x', storage: 'cloudinary' });
  });

  it('rethrows the R2 failure when Cloudinary is not configured', async () => {
    mocks.readR2UploadConfig.mockReturnValue(R2_READY);
    mocks.isCloudinaryConfigured.mockReturnValue(false);
    mocks.uploadImageToR2.mockRejectedValue(new Error('R2 down'));

    await expect(storeChatImage(pngFile(), 'image/png')).rejects.toThrow('R2 down');
  });

  it.each([{ status: 'disabled' }, { status: 'misconfigured', missing: ['R2_BUCKET'] }])(
    'uses Cloudinary when R2 is $status',
    async (r2) => {
      mocks.readR2UploadConfig.mockReturnValue(r2);
      mocks.isCloudinaryConfigured.mockReturnValue(true);

      const stored = await storeChatImage(pngFile(), 'image/png');

      expect(stored?.storage).toBe('cloudinary');
      expect(mocks.uploadImageToR2).not.toHaveBeenCalled();
    },
  );

  it('returns null when no store is configured', async () => {
    mocks.readR2UploadConfig.mockReturnValue({ status: 'disabled' });
    mocks.isCloudinaryConfigured.mockReturnValue(false);

    expect(await storeChatImage(pngFile(), 'image/png')).toBeNull();
  });
});
