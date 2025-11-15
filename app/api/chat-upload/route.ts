import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/utils/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { status: 'error', message: 'No file provided' },
        { status: 400 }
      );
    }

    // Get auth token (optional validation)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required. Please log in.',
      }, { status: 401 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { status: 'error', message: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      return NextResponse.json({
        status: 'error',
        message: 'Image upload service not configured',
        detail: 'Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables',
      }, { status: 500 });
    }

    // Upload to Cloudinary
    console.log('☁️ Uploading image to Cloudinary...');
    const result = await uploadToCloudinary(file, 'chat');

    console.log(' Image uploaded successfully:', result.secure_url);
    
    return NextResponse.json({
      status: 'success',
      file_url: result.secure_url,
      url: result.secure_url,
      file: result.secure_url,
      filename: result.public_id,
      cloudinary: {
        public_id: result.public_id,
        asset_id: result.asset_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      }
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to upload image',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
