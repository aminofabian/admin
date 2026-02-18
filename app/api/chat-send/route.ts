import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';

/**
 * Proxy for sending a chat message. Tries backend endpoints in order:
 * 1. POST /api/v1/admin/chat/?request_type=send_message (admin chat pattern)
 * 2. POST /api/v1/admin/chat/?request_type=send
 * 3. POST /api/v1/chat/send/ (standalone send endpoint from Postman)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { status: 'error', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    };

    const tryEndpoint = async (url: string): Promise<Response> =>
      fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    // 1. Try admin chat with request_type=send_message
    let res = await tryEndpoint(`${BACKEND_URL}/api/v1/admin/chat/?request_type=send_message`);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data);
    }

    // 2. Try admin chat with request_type=send
    if (res.status === 404) {
      res = await tryEndpoint(`${BACKEND_URL}/api/v1/admin/chat/?request_type=send`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data);
      }
    }

    // 3. Try standalone /api/v1/chat/send/
    if (res.status === 404) {
      res = await tryEndpoint(`${BACKEND_URL}/api/v1/chat/send/`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data);
      }
    }

    const text = await res.text();
    console.error('❌ Chat send backend error:', res.status, text);
    return NextResponse.json(
      { status: 'error', message: `Failed to send message: ${res.status}` },
      { status: res.status }
    );
  } catch (error) {
    console.error('❌ Chat send proxy error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to send chat message',
      },
      { status: 500 }
    );
  }
}
