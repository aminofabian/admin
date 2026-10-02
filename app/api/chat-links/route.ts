import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/api/proxy-fetch';
import { proxyErrorResponse } from '@/lib/api/proxy-route-response';

const ROUTE_LABEL = 'chat-links';
import { buildUpstreamError, createErrorRequestId } from '@/lib/api/upstream-error';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    const apiUrl = `${backendUrl}/api/v1/chat-links/`;

    const authHeader = request.headers.get('Authorization');

    console.log('🔵 Proxying chat links request to:', apiUrl);
    // Log presence only: a token prefix exposes the JWT header and payload
    // (user id, role, expiry) to whatever aggregates these logs.
    console.log('🔑 Authorization header:', authHeader ? 'present' : 'MISSING');

    if (!authHeader) {
      console.error('❌ No Authorization header provided');
      return NextResponse.json(
        {
          status: 'error',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: authHeader,
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
      console.error('❌ Backend error response:', errorText.substring(0, 500));

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

    // Log the response structure for debugging
    console.log('📦 Chat links response:', {
      isArray: Array.isArray(data),
      type: typeof data,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : 'N/A',
    });

    // Ensure we always return an array
    const linksArray = Array.isArray(data) ? data : [];

    return NextResponse.json(linksArray);
  } catch (error) {
    return proxyErrorResponse(error, 'chat-links');
  }
}

