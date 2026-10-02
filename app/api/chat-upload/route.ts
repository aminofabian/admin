import { NextRequest, NextResponse } from 'next/server';
import {
  uploadToCloudinary,
  isCloudinaryConfigured,
} from '@/lib/utils/cloudinary';
import { guardBearerToken } from '@/lib/auth/server-token-guard';
import {
  MAX_UPLOAD_BYTES,
  validateUploadedImage,
} from '@/lib/utils/image-upload-validation';

export async function POST(request: NextRequest) {
  try {
    // Authenticate before touching the body: an unauthenticated caller should
    // not be able to make this endpoint buffer a multi-megabyte payload.
    const guard = guardBearerToken(request.headers.get('Authorization'), {
      requireRole: true,
    });
    if (!guard.ok) {
      return guard.response;
    }

    // Reject an oversized body using the declared length when present. This is
    // a cheap pre-check; the definitive check is the file's own size below.
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { status: 'error', message: 'Image is too large. Maximum size is 10 MB.' },
        { status: 413 },
      );
    }

    if (!isCloudinaryConfigured()) {
      // Do not disclose the expected environment variable names to the caller.
      console.error('chat-upload: Cloudinary is not configured on the server.');
      return NextResponse.json(
        { status: 'error', message: 'Image upload service not configured' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { status: 'error', message: 'No file provided' },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { status: 'error', message: 'Image is too large. Maximum size is 10 MB.' },
        { status: 413 },
      );
    }

    // Validate by file content, not the client-supplied Content-Type.
    const validation = await validateUploadedImage(file);
    if (!validation.ok) {
      return NextResponse.json(
        { status: 'error', message: validation.reason },
        { status: 400 },
      );
    }

    const result = await uploadToCloudinary(file, 'chat');

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
      },
    });
  } catch (error) {
    console.error('chat-upload failed:', error);

    // Never echo the underlying message: it can contain Cloudinary internals
    // or configuration detail.
    return NextResponse.json(
      { status: 'error', message: 'Failed to upload image' },
      { status: 500 },
    );
  }
}
