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
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local'
    );
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
        resource_type: 'auto', // Let Cloudinary auto-detect the resource type
        // Don't specify format - let Cloudinary auto-detect it
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
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}
