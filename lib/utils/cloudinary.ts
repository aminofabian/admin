import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  asset_id?: string; // Optional: not always provided by Cloudinary
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  url: string;
}

/**
 * Upload image to Cloudinary
 * @param file - File object to upload
 * @param folder - Cloudinary folder (default: 'chat')
 * @returns Upload result with secure_url
 */
export async function uploadToCloudinary(
  file: File,
  folder = 'chat'
): Promise<CloudinaryUploadResult> {
  // Validate configuration
  const configProblem = describeCloudinaryConfigProblem();
  if (configProblem) {
    throw new Error(`Cloudinary not configured: ${configProblem}`);
  }

  // Convert file to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate unique filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const uniqueFileName = `${timestamp}_${randomStr}`;

  // Upload to Cloudinary using promise wrapper
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: uniqueFileName,
        // Pin the resource type and format allowlist rather than using
        // `resource_type: 'auto'`, which would let Cloudinary store whatever
        // bytes arrived (SVG/HTML are both reachable from a crafted upload).
        // Callers validate the content by magic number before reaching here.
        resource_type: 'image',
        allowed_formats: ['png', 'jpg', 'gif', 'webp'],
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', {
            message: error.message,
            http_code: error.http_code,
            name: error.name,
          });
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result) {
          console.log(' Cloudinary upload success:', result.secure_url);
          resolve(result as CloudinaryUploadResult);
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    // Write buffer to stream
    uploadStream.end(buffer);
  });
}

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 */
export async function deleteFromCloudinary(
  publicId: string
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(' Deleted from Cloudinary:', publicId);
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
    throw error;
  }
}

/**
 * A Cloudinary credential is an opaque token: a cloud name, a numeric API key,
 * and a secret. None of them is ever an `http(s)://` URL.
 */
function looksLikeUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

/**
 * Explain why the Cloudinary configuration is unusable, or return `null` when
 * every variable is present and plausibly shaped.
 *
 * A non-empty check alone is not enough. A secret holding the backend's API
 * URL passes it, so the upload reaches Cloudinary, is rejected with a 401, and
 * the operator sees only a generic "Failed to upload image". Surfacing the
 * reason turns that silent failure into an actionable server log.
 */
export function describeCloudinaryConfigProblem(): string | null {
  const entries: Array<{ name: string; value: string }> = [
    { name: 'CLOUDINARY_CLOUD_NAME', value: (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim() },
    { name: 'CLOUDINARY_API_KEY', value: (process.env.CLOUDINARY_API_KEY ?? '').trim() },
    { name: 'CLOUDINARY_API_SECRET', value: (process.env.CLOUDINARY_API_SECRET ?? '').trim() },
  ];

  const missing = entries.filter((entry) => !entry.value).map((entry) => entry.name);
  if (missing.length > 0) {
    return `${missing.join(', ')} not set`;
  }

  const urlShaped = entries
    .filter((entry) => looksLikeUrl(entry.value))
    .map((entry) => entry.name);
  if (urlShaped.length > 0) {
    return `${urlShaped.join(', ')} looks like a URL, not a Cloudinary value`;
  }

  return null;
}

/**
 * Check if Cloudinary is configured with usable credentials.
 */
export function isCloudinaryConfigured(): boolean {
  return describeCloudinaryConfigProblem() === null;
}
