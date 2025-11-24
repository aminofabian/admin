import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json(
        { status: 'error', message: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Convert relative URLs to absolute
    let absoluteUrl = imageUrl;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      absoluteUrl = imageUrl.startsWith('/') 
        ? `${BACKEND_URL}${imageUrl}`
        : `${BACKEND_URL}/${imageUrl}`;
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization');

    console.log('🔄 Proxying banner image:', {
      original: imageUrl,
      absolute: absoluteUrl,
      hasAuth: !!authHeader,
    });

    // Fetch the image from backend (server-side, no CORS issues)
    const response = await fetch(absoluteUrl, {
      method: 'GET',
      headers: authHeader ? {
        'Authorization': authHeader,
      } : {},
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch image:', response.status, response.statusText);
      return NextResponse.json(
        { status: 'error', message: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image as a blob
    const blob = await response.blob();
    
    if (blob.size === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Received empty image file' },
        { status: 400 }
      );
    }

    // Get content type from response or blob
    const contentType = response.headers.get('content-type') || blob.type || 'image/jpeg';

    console.log('✅ Successfully proxied image:', {
      size: blob.size,
      contentType,
    });

    // Return the blob with proper headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': blob.size.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('❌ Error proxying banner image:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to proxy image',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

