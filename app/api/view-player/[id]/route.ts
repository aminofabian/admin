import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bruii.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;

    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    
    // Forward directly to the Django backend
    const backendUrl = `${BACKEND_URL}/api/v1/view-player/${playerId}/`;

    console.log('🔷 View Player Proxy Configuration:');
    console.log('  - BACKEND_URL:', BACKEND_URL);
    console.log('  - Full backend URL:', backendUrl);
    console.log('  - Player ID:', playerId);
    console.log('  - Auth header:', authHeader ? authHeader.substring(0, 30) + '...' : 'Missing');

    // Forward the GET request with Bearer token
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 Backend response status:', response.status);

    // Get the response data as JSON
    const data = await response.json();
    console.log('📥 Backend response data:', data);

    // Return the response with the backend's status code
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('❌ Proxy error details:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to fetch player details',
      },
      { status: 500 }
    );
  }
}

