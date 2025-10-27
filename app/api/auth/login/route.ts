import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔷 Proxying login to:', `${BACKEND_URL}/users/login/`);
    console.log('📤 Request body:', { username: body.username, hasPassword: !!body.password });

    // Forward the request to the Django backend
    const response = await fetch(`${BACKEND_URL}/users/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 Backend response status:', response.status);

    // Parse the response
    const data = await response.json();
    
    console.log('📥 Backend response data:', data);

    // Always return 200 to Next.js, but include the backend status in the body
    // This prevents CORS issues while still allowing the client to handle errors
    return NextResponse.json({
      ...data,
      _status: response.status, // Include original status
    });
  } catch (error) {
    console.error('❌ Login proxy error:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process login request',
        _status: 500,
      },
      { status: 500 }
    );
  }
}
