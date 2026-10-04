import { NextRequest, NextResponse } from 'next/server';
import { storeChatImage } from '@/lib/storage/store-chat-image';
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

    const stored = await storeChatImage(file, validation.mime);
    if (!stored) {
      // Do not disclose the expected environment variable names to the caller.
      console.error('chat-upload: no image storage (R2 or Cloudinary) is configured.');
      return NextResponse.json(
        { status: 'error', message: 'Image upload service not configured' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: 'success',
      file_url: stored.url,
      url: stored.url,
      file: stored.url,
      filename: stored.filename,
      storage: stored.storage,
    });
  } catch (error) {
    console.error('chat-upload failed:', error);

    // Never echo the underlying message: it can contain storage-provider
    // internals or configuration detail.
    return NextResponse.json(
      { status: 'error', message: 'Failed to upload image' },
      { status: 500 },
    );
  }
}
