import { randomBytes } from 'crypto';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const RANDOM_SUFFIX_BYTES = 8;

const randomSuffix = () => randomBytes(RANDOM_SUFFIX_BYTES).toString('hex');

/** Matches the `chat/<timestamp>_<random>` naming already used on Cloudinary. */
export function buildR2ObjectKey(
  folder: string,
  mime: string,
  now: number = Date.now(),
  makeSuffix: () => string = randomSuffix,
): string {
  const extension = EXTENSION_BY_MIME[mime];
  if (!extension) {
    throw new Error(`Unsupported image type for storage: ${mime}`);
  }
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  return `${cleanFolder}/${now}_${makeSuffix()}.${extension}`;
}
