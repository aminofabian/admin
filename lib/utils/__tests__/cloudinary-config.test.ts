import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  describeCloudinaryConfigProblem,
  isCloudinaryConfigured,
} from '../cloudinary';

const KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

describe('Cloudinary configuration guard', () => {
  const original = { ...process.env };

  beforeEach(() => {
    for (const key of KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it('names the variables that are not set', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'dzlv4lat4';
    process.env.CLOUDINARY_API_KEY = '594512592871445';

    expect(describeCloudinaryConfigProblem()).toMatch(/CLOUDINARY_API_SECRET/);
    expect(isCloudinaryConfigured()).toBe(false);
  });

  it('treats whitespace-only values as missing', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'dzlv4lat4';
    process.env.CLOUDINARY_API_KEY = '594512592871445';
    process.env.CLOUDINARY_API_SECRET = '   ';

    expect(describeCloudinaryConfigProblem()).toMatch(/CLOUDINARY_API_SECRET/);
  });

  it('accepts a plausibly shaped configuration', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'dzlv4lat4';
    process.env.CLOUDINARY_API_KEY = '594512592871445';
    process.env.CLOUDINARY_API_SECRET = 'F-Gh9PJZyo-PgKNG8iNVKjrmjhA';

    expect(describeCloudinaryConfigProblem()).toBeNull();
    expect(isCloudinaryConfigured()).toBe(true);
  });

  it('rejects an API secret that is actually a URL', () => {
    // The real-world fault: the backend API URL was pasted into the secret.
    // A non-empty check passed it, so uploads failed with an opaque 401.
    process.env.CLOUDINARY_CLOUD_NAME = 'dzlv4lat4';
    process.env.CLOUDINARY_API_KEY = '594512592871445';
    process.env.CLOUDINARY_API_SECRET = 'https://api.serverhub.biz';

    expect(describeCloudinaryConfigProblem()).toMatch(
      /CLOUDINARY_API_SECRET looks like a URL/i,
    );
    expect(isCloudinaryConfigured()).toBe(false);
  });
});
