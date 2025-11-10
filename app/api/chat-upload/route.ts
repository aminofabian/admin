import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueFileName = `${timestamp}_${randomStr}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'chat');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const filePath = join(uploadsDir, uniqueFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate URL - properly detect production domain
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      // Try to get from request headers (works in production)
      const proto = request.headers.get('x-forwarded-proto') || 
                    request.headers.get('x-forwarded-protocol') || 
                    'https';
      const host = request.headers.get('x-forwarded-host') || 
                   request.headers.get('host') || 
                   'localhost:3000';
      baseUrl = `${proto}://${host}`;
    }
    
    const fileUrl = `${baseUrl}/uploads/chat/${uniqueFileName}`;

    console.log('✅ Image uploaded successfully:', fileUrl);
    console.log('🌐 Base URL used:', baseUrl);
    
    return NextResponse.json({
      status: 'success',
      file_url: fileUrl,
      url: fileUrl,
      file: fileUrl,
      filename: uniqueFileName,
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
