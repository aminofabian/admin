import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/api/proxy-fetch';
import { proxyErrorResponse } from '@/lib/api/proxy-route-response';

const ROUTE_LABEL = 'chat-purchases';
import { buildUpstreamError, createErrorRequestId } from '@/lib/api/upstream-error';

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
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    //  Using new JWT-authenticated endpoint
    // Use chatroom_id if available, otherwise use user_id
    const identifierParam = chatroomId 
      ? `chatroom_id=${chatroomId}` 
      : `user_id=${userId}`;
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?${identifierParam}&request_type=purchases_list`;
    
    console.log('📍 Fetching purchases with:', chatroomId ? `chatroom_id=${chatroomId}` : `user_id=${userId}`);

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying purchase history request to:', apiUrl);
    // Log presence only: a token prefix exposes the JWT header and payload
    // (user id, role, expiry) to whatever aggregates these logs.
    console.log('🔑 Authorization header:', authHeader ? 'present' : 'MISSING');

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

    const response = await proxyFetch(apiUrl, {
      method: 'GET',
      headers,
      callerSignal: request.signal,
      label: ROUTE_LABEL,
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      const requestId = createErrorRequestId();
      const safe = buildUpstreamError(response.status, errorText, requestId);
      // Full upstream body is logged, never returned to the browser.
      console.error(`[chat-proxy ${requestId}] upstream ${response.status}:`, errorText);
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
          message: safe.message,
          detail: safe.detail,
          request_id: safe.requestId,
          upstream_status: safe.upstreamStatus,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(` Received ${data.messages?.length || 0} purchase records from backend`);
    
    return NextResponse.json(data);
  } catch (error) {
    return proxyErrorResponse(error, 'chat-purchases');
  }
}

