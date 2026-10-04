import { describe, expect, it, vi } from 'vitest';
import type { PutObjectCommand } from '@aws-sdk/client-s3';
import { uploadImageToR2 } from '../upload-image-to-r2';

const CONFIG = {
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  bucket: 'picshare-media',
  endpoint: 'https://acct.r2.cloudflarestorage.com',
  publicBaseUrl: 'https://media.example.com',
};

describe('uploadImageToR2', () => {
  it('puts the object with its content type and returns the public URL', async () => {
    const send = vi.fn<(command: PutObjectCommand) => Promise<unknown>>().mockResolvedValue({});
    const body = new Uint8Array([1, 2, 3]);

    const url = await uploadImageToR2(
      CONFIG,
      { key: 'chat/1_abc.png', body, contentType: 'image/png' },
      send,
    );

    expect(url).toBe('https://media.example.com/chat/1_abc.png');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'picshare-media',
      Key: 'chat/1_abc.png',
      Body: body,
      ContentType: 'image/png',
    });
  });

  it('propagates storage failures', async () => {
    const send = vi.fn().mockRejectedValue(new Error('AccessDenied'));
    await expect(
      uploadImageToR2(CONFIG, { key: 'k.png', body: new Uint8Array(), contentType: 'image/png' }, send),
    ).rejects.toThrow('AccessDenied');
  });
});
