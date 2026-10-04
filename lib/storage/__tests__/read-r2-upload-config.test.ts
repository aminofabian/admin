import { describe, expect, it } from 'vitest';
import { readR2UploadConfig } from '../read-r2-upload-config';

const FULL_ENV = {
  MEDIA_UPLOAD_PROVIDER: 'r2',
  R2_ACCOUNT_ID: 'acct123',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'picshare-media',
  R2_PUBLIC_BASE_URL: 'https://media.example.com/',
};

describe('readR2UploadConfig', () => {
  it('is disabled unless MEDIA_UPLOAD_PROVIDER is r2', () => {
    expect(readR2UploadConfig({ ...FULL_ENV, MEDIA_UPLOAD_PROVIDER: undefined })).toEqual({
      status: 'disabled',
    });
    expect(readR2UploadConfig({ ...FULL_ENV, MEDIA_UPLOAD_PROVIDER: 'cloudinary' })).toEqual({
      status: 'disabled',
    });
  });

  it('derives the endpoint from the account id and trims trailing slashes', () => {
    expect(readR2UploadConfig({ ...FULL_ENV, MEDIA_UPLOAD_PROVIDER: ' R2 ' })).toEqual({
      status: 'ready',
      config: {
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        bucket: 'picshare-media',
        endpoint: 'https://acct123.r2.cloudflarestorage.com',
        publicBaseUrl: 'https://media.example.com',
      },
    });
  });

  it('prefers an explicit endpoint over the account id', () => {
    const result = readR2UploadConfig({ ...FULL_ENV, R2_ENDPOINT: 'https://custom.endpoint/' });
    expect(result.status === 'ready' && result.config.endpoint).toBe('https://custom.endpoint');
  });

  it('reports every missing variable', () => {
    expect(
      readR2UploadConfig({ MEDIA_UPLOAD_PROVIDER: 'r2', R2_BUCKET: 'picshare-media' }),
    ).toEqual({
      status: 'misconfigured',
      missing: ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_PUBLIC_BASE_URL'],
    });
  });
});
