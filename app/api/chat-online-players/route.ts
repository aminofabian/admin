import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy for REST API endpoint: /api/v1/admin/chat/?request_type=online_players
 * This endpoint uses JWT authentication
 * Returns the latest online players
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?request_type=online_players`;

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying online players request to:', apiUrl);
    console.log('🔑 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 30)}...` : 'MISSING');

    if (!authHeader) {
      console.error('❌ No Authorization header provided');
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required',
      }, { status: 401 });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    };

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText.substring(0, 500));
      
      if (response.status === 401) {
        return NextResponse.json({
          status: 'error',
          message: 'Authentication failed. Please log in again.',
          detail: 'JWT token is invalid or expired.',
        }, { status: 401 });
      }
      
      return NextResponse.json(
        { 
          status: 'error', 
          message: `Backend error: ${response.status} ${response.statusText}`,
          detail: errorText.substring(0, 200),
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ Received online players data from backend`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying online players request:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch online players',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

