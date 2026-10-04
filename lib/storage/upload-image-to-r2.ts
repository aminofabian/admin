import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { R2UploadConfig } from './read-r2-upload-config';

const R2_REGION = 'auto';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export interface R2ImageUpload {
  key: string;
  body: Uint8Array;
  contentType: string;
}

type SendCommand = (command: PutObjectCommand) => Promise<unknown>;

const createSender = (config: R2UploadConfig): SendCommand => {
  const client = new S3Client({
    region: R2_REGION,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return (command) => client.send(command);
};

/** Writes the object and returns its public URL. */
export async function uploadImageToR2(
  config: R2UploadConfig,
  image: R2ImageUpload,
  send: SendCommand = createSender(config),
): Promise<string> {
  await send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: image.key,
      Body: image.body,
      ContentType: image.contentType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }),
  );
  return `${config.publicBaseUrl}/${image.key}`;
}
