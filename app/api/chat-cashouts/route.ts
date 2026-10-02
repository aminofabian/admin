import { NextRequest, NextResponse } from 'next/server';
import { buildUpstreamError, createErrorRequestId } from '@/lib/api/upstream-error';
import { proxyFetch } from '@/lib/api/proxy-fetch';
import { proxyErrorResponse } from '@/lib/api/proxy-route-response';

/**
 * API Proxy for JWT-authenticated endpoint: /api/v1/admin/chat/?request_type=cashouts_list
 * Proxies from same-origin to avoid CORS when calling backend from the browser.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatroomId = searchParams.get('chatroom_id');
  const userId = searchParams.get('user_id');

  if (!chatroomId && !userId) {
    return NextResponse.json(
      { status: 'error', message: 'chatroom_id or user_id is required' },
      { status: 400 }
    );
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
    const identifierParam = chatroomId
      ? `chatroom_id=${chatroomId}`
      : `user_id=${userId}`;
    const apiUrl = `${backendUrl}/api/v1/admin/chat/?${identifierParam}&request_type=cashouts_list`;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required. Please log in.',
      }, { status: 401 });
    }

    const response = await proxyFetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      callerSignal: request.signal,
      label: 'chat-cashouts',
    });

    if (!response.ok) {
      const errorText = await response.text();
      const requestId = createErrorRequestId();
      const safe = buildUpstreamError(response.status, errorText, requestId);
      // Full upstream body is logged, never returned to the browser.
      console.error(`[chat-proxy ${requestId}] upstream ${response.status}:`, errorText);
      if (response.status === 401) {
        return NextResponse.json({
          status: 'error',
          message: 'Authentication failed. Please log in again.',
          detail: 'JWT token is invalid or expired.',
        }, { status: 401 });
      }
      if (response.status === 404) {
        return NextResponse.json({ cashouts: [] });
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
    return NextResponse.json(data);
  } catch (error) {
    return proxyErrorResponse(error, 'chat-cashouts');
  }
}
