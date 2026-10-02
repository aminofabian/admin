import { NextRequest, NextResponse } from 'next/server';
import { buildUpstreamError, createErrorRequestId } from '@/lib/api/upstream-error';
import { proxyFetch } from '@/lib/api/proxy-fetch';

/**
 * API Proxy for REST API endpoint: /api/v1/admin/chat/?request_type=online_players
 * This endpoint uses JWT authentication
 * Returns the latest online players
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?request_type=online_players`;

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying online players request to:', apiUrl);
    // Log presence only: a token prefix exposes the JWT header and payload
    // (user id, role, expiry) to whatever aggregates these logs.
    console.log('🔑 Authorization header:', authHeader ? 'present' : 'MISSING');

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

    // Timeout, caller-disconnect propagation and network-error normalisation are
    // handled by the shared helper (see lib/api/proxy-fetch.ts).
    const response = await proxyFetch(apiUrl, {
      method: 'GET',
      headers,
      callerSignal: request.signal,
      label: 'chat-online-players',
    });

    console.log('📥 Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      const requestId = createErrorRequestId();
      const safe = buildUpstreamError(response.status, errorText, requestId);
      // Full upstream body is logged, never returned to the browser.
      console.error(`[chat-proxy ${requestId}] upstream ${response.status}:`, errorText);
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
          message: safe.message,
          detail: safe.detail,
          request_id: safe.requestId,
          upstream_status: safe.upstreamStatus,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(` Received online players data from backend:`, JSON.stringify(data).substring(0, 500));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying online players request:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch online players';
    let errorDetail = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        errorMessage = 'Request timeout. The server is taking too long to respond.';
        errorDetail = 'The request exceeded the timeout limit. Please try again.';
        statusCode = 408;
      } else if (error.message.includes('fetch failed') || error.message.includes('ConnectTimeoutError')) {
        errorMessage = 'Connection failed. Unable to reach the server.';
        errorDetail = 'Please check your network connection and try again.';
        statusCode = 503;
      }
    }
    
    return NextResponse.json({
      status: 'error',
      message: errorMessage,
      detail: errorDetail,
    }, { status: statusCode });
  }
}

