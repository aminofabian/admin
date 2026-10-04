import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/utils/cloudinary';
import { buildR2ObjectKey } from './build-r2-object-key';
import { readR2UploadConfig, type R2UploadConfig } from './read-r2-upload-config';
import { uploadImageToR2 } from './upload-image-to-r2';

const CHAT_FOLDER = 'chat';

export interface StoredChatImage {
  url: string;
  filename: string;
  storage: 'r2' | 'cloudinary';
}

const storeInR2 = async (
  config: R2UploadConfig,
  file: File,
  mime: string,
): Promise<StoredChatImage> => {
  const key = buildR2ObjectKey(CHAT_FOLDER, mime);
  const body = new Uint8Array(await file.arrayBuffer());
  const url = await uploadImageToR2(config, { key, body, contentType: mime });
  return { url, filename: key, storage: 'r2' };
};

const storeInCloudinary = async (file: File): Promise<StoredChatImage> => {
  const result = await uploadToCloudinary(file, CHAT_FOLDER);
  return { url: result.secure_url, filename: result.public_id, storage: 'cloudinary' };
};

/**
 * Stores to R2 when MEDIA_UPLOAD_PROVIDER=r2 is fully configured. Cloudinary
 * stays the fallback (R2 disabled, misconfigured or failing) for as long as its
 * credentials are present. Returns null when neither store is usable.
 */
export async function storeChatImage(
  file: File,
  mime: string,
): Promise<StoredChatImage | null> {
  const r2 = readR2UploadConfig();
  const cloudinaryAvailable = isCloudinaryConfigured();

  if (r2.status === 'misconfigured') {
    console.error('chat-upload: R2 enabled but missing env vars:', r2.missing.join(', '));
  }

  if (r2.status === 'ready') {
    try {
      return await storeInR2(r2.config, file, mime);
    } catch (error) {
      if (!cloudinaryAvailable) throw error;
      console.error('chat-upload: R2 upload failed, falling back to Cloudinary:', error);
    }
  }

  return cloudinaryAvailable ? storeInCloudinary(file) : null;
}
