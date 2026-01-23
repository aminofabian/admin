import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    // Use the REST API endpoint for players instead of Django admin view
    const apiUrl = `${backendUrl}/api/v1/players/?page_size=100`;

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying chat users request to:', apiUrl);
    console.log('🔑 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 30)}...` : 'MISSING');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText.substring(0, 500));
      
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
    
    // Transform REST API paginated response to chat users format
    const players = data.results || data.player || [];
    console.log(` Received ${players.length} players from backend`);
    
    // Return in a format the frontend expects
    return NextResponse.json({
      status: 'success',
      player: players,
      count: data.count || players.length,
    });
  } catch (error) {
    console.error('❌ Error proxying chat users request:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch chat users',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

