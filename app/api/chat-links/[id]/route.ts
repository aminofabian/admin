import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/api/proxy-fetch';
import { proxyErrorResponse } from '@/lib/api/proxy-route-response';

const ROUTE_LABEL = 'link-detail';
import { buildUpstreamError, createErrorRequestId } from '@/lib/api/upstream-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    const apiUrl = `${backendUrl}/api/v1/chat-links/${id}/`;

    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { status: 'error', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await proxyFetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      callerSignal: request.signal,
      label: 'chat-link-detail',
    });

    if (!response.ok) {
      const errorText = await response.text();
      const requestId = createErrorRequestId();
      const safe = buildUpstreamError(response.status, errorText, requestId);
      // Full upstream body is logged, never returned to the browser.
      console.error(`[chat-proxy ${requestId}] upstream ${response.status}:`, errorText);
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
    return NextResponse.json(data);
  } catch (error) {
    return proxyErrorResponse(error, 'chat-link-detail');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    const apiUrl = `${backendUrl}/api/v1/chat-links/${id}/`;

    const authHeader = request.headers.get('Authorization');
    const body = await request.json();

    console.log('🔵 Proxying chat link update request to:', apiUrl);
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
      method: 'PATCH',
      headers,
      callerSignal: request.signal,
      body: JSON.stringify(body),
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

    return NextResponse.json(data);
  } catch (error) {
    return proxyErrorResponse(error, 'chat-link-update');
  }
}

