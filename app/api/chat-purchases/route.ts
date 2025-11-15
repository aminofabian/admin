import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy for JWT-authenticated endpoint: /api/v1/admin/chat/?request_type=purchases_list
 * This endpoint uses JWT authentication via Authorization header
 * Returns purchase/transaction history for a specific chatroom
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatroomId = searchParams.get('chatroom_id');
  const userId = searchParams.get('user_id');

  // Accept either chatroom_id OR user_id
  if (!chatroomId && !userId) {
    return NextResponse.json(
      { status: 'error', message: 'chatroom_id or user_id is required' },
      { status: 400 }
    );
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://admin.serverhub.biz';
    //  Using new JWT-authenticated endpoint
    // Use chatroom_id if available, otherwise use user_id
    const identifierParam = chatroomId 
      ? `chatroom_id=${chatroomId}` 
      : `user_id=${userId}`;
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?${identifierParam}&request_type=purchases_list`;
    
    console.log('📍 Fetching purchases with:', chatroomId ? `chatroom_id=${chatroomId}` : `user_id=${userId}`);

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying purchase history request to:', apiUrl);
    console.log('🔑 Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 30)}...` : 'MISSING');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    //  Use JWT authentication (Authorization header)
    if (authHeader) {
      headers['Authorization'] = authHeader;
    } else {
      console.warn('⚠️ No Authorization header provided');
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required. Please log in.',
      }, { status: 401 });
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response status:', response.status);
      console.error('❌ Backend error headers:', Object.fromEntries(response.headers.entries()));
      console.error('❌ Backend error body:', errorText.substring(0, 1000));
      
      if (response.status === 401) {
        return NextResponse.json({
          status: 'error',
          message: 'Authentication failed. Please log in again.',
          detail: 'JWT token is invalid or expired.',
        }, { status: 401 });
      }
      
      if (response.status === 404) {
        console.warn('⚠️ Backend returned 404. No purchase history found.');
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
    console.log(` Received ${data.messages?.length || 0} purchase records from backend`);
    
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

