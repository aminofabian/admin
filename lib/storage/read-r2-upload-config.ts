export interface R2UploadConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
}

export type R2UploadConfigResult =
  | { status: 'disabled' }
  | { status: 'misconfigured'; missing: string[] }
  | { status: 'ready'; config: R2UploadConfig };

const R2_PROVIDER = 'r2';

const accountEndpoint = (accountId: string | undefined) =>
  accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

/**
 * R2 uploads stay off until MEDIA_UPLOAD_PROVIDER=r2, so the code can ship
 * before the bucket credentials are set and the switch is a pure env change.
 */
export function readR2UploadConfig(
  env: Record<string, string | undefined> = process.env,
): R2UploadConfigResult {
  if (env.MEDIA_UPLOAD_PROVIDER?.trim().toLowerCase() !== R2_PROVIDER) {
    return { status: 'disabled' };
  }

  const required = {
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID?.trim(),
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY?.trim(),
    R2_BUCKET: env.R2_BUCKET?.trim(),
    R2_ENDPOINT: env.R2_ENDPOINT?.trim() || accountEndpoint(env.R2_ACCOUNT_ID?.trim()),
    R2_PUBLIC_BASE_URL: env.R2_PUBLIC_BASE_URL?.trim(),
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    return { status: 'misconfigured', missing };
  }

  return {
    status: 'ready',
    config: {
      accessKeyId: required.R2_ACCESS_KEY_ID!,
      secretAccessKey: required.R2_SECRET_ACCESS_KEY!,
      bucket: required.R2_BUCKET!,
      endpoint: trimTrailingSlash(required.R2_ENDPOINT!),
      publicBaseUrl: trimTrailingSlash(required.R2_PUBLIC_BASE_URL!),
    },
  };
}
