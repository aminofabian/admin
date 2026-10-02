import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/api/proxy-fetch';
import { proxyErrorResponse } from '@/lib/api/proxy-route-response';

const ROUTE_LABEL = 'chat-all-players';
import { buildUpstreamError, createErrorRequestId } from '@/lib/api/upstream-error';

/**
 * API Proxy for REST API endpoint: /api/v1/admin/chat/?request_type=all_players
 * This endpoint uses JWT authentication (not session cookies)
 * Returns all players in the system with chat context
 * Note: Last messages come from WebSocket (active chats) and are merged in the frontend
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('page_size') || '50';

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    // Use the admin chat API endpoint for all players
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?request_type=all_players&page=${page}&page_size=${pageSize}`;

    const authHeader = request.headers.get('Authorization');
    
    console.log('🔵 Proxying all players request to:', apiUrl);
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
        console.warn('⚠️ Backend returned 401. JWT token might be expired or invalid.');
        return NextResponse.json({
          status: 'error',
          message: 'Authentication required. Please re-login.',
          results: [],
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
    console.log(` Received ${data.results?.length || 0} players from backend (total count: ${data.count || 0})`);
    
    return NextResponse.json(data);
  } catch (error) {
    return proxyErrorResponse(error, 'chat-all-players');
  }
}

