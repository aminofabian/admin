import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy for Django admin endpoint: /admin/chat/?request_type=purchases_list
 * This endpoint requires Django session authentication (not JWT)
 * Returns purchase/transaction history for a specific chatroom
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatroomId = searchParams.get('chatroom_id');

  if (!chatroomId) {
    return NextResponse.json(
      { status: 'error', message: 'chatroom_id is required' },
      { status: 400 }
    );
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';
    const apiUrl = `${backendUrl}/admin/chat/?chatroom_id=${chatroomId}&request_type=purchases_list`;

    const authHeader = request.headers.get('Authorization');
    const cookieHeader = request.headers.get('Cookie');
    
    console.log('🔵 Proxying purchase history request to:', apiUrl);
    console.log('🔑 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 30)}...` : 'MISSING');
    console.log('🍪 Cookie header:', cookieHeader ? `Present (${cookieHeader?.split(';').length} cookies)` : 'MISSING');
    console.log('🍪 Cookies:', cookieHeader?.split(';').map(c => c.trim().split('=')[0]).join(', ') || 'none');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Forward both Authorization header (JWT) and cookies (session)
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      credentials: 'include', // Important: include credentials for session cookies
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    // Check if response is HTML (login redirect) instead of JSON
    const contentType = response.headers.get('content-type');
    const isHtml = contentType?.includes('text/html');

    if (isHtml) {
      console.error('❌ Backend returned HTML instead of JSON - likely authentication failure');
      console.error('🔍 Content-Type:', contentType);
      console.error('🔍 Status:', response.status);
      
      // This means session cookie is missing or invalid
      return NextResponse.json({
        status: 'error',
        message: 'Session authentication failed. Please log out and log back in.',
        detail: 'Backend returned HTML (login page) instead of JSON. Session cookie is missing or expired.',
      }, { status: 401 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response status:', response.status);
      console.error('❌ Backend error headers:', Object.fromEntries(response.headers.entries()));
      console.error('❌ Backend error body:', errorText.substring(0, 1000));
      
      if (response.status === 404 || response.status === 302) {
        console.warn('⚠️ Backend returned 404/302. Session cookie might be missing or invalid.');
        return NextResponse.json({
          status: 'success',
          messages: [],
          message: 'No purchase history available.',
        });
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
    console.log(`✅ Received ${data.messages?.length || 0} purchase records from backend`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying purchase history request:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch purchase history',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

