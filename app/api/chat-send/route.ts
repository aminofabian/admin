import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';

/**
 * Proxy for sending a chat message. Uses the same endpoint and body as the chat
 * component's REST fallback in use-chat-websocket.ts:
 *   POST /api/v1/chat/send/
 *   Body: { sender_id, receiver_id, message, is_player_sender, sent_time }
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
    const backendUrl = `${BACKEND_URL}/api/v1/chat/send/`;

    // 1. Same body as chat REST fallback: sender_id, receiver_id, message, is_player_sender, sent_time
    let response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // 2. If 400, try Postman format: chatroom_id + message (backend may expect chatroom_id)
    if (response.status === 400 && body.receiver_id != null && body.message != null) {
      const postmanBody = {
        chatroom_id: body.receiver_id,
        message: body.message,
      };
      response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(postmanBody),
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Chat send backend error:', response.status, text);
      const errorPayload: { status: string; message: string; detail?: string } = {
        status: 'error',
        message: `Failed to send message: ${response.status}`,
      };
      try {
        const parsed = JSON.parse(text) as { message?: string; detail?: string; error?: string };
        if (parsed.message || parsed.detail || parsed.error) {
          errorPayload.message = parsed.message || parsed.detail || parsed.error || errorPayload.message;
          errorPayload.detail = text;
        }
      } catch {
        errorPayload.detail = text;
      }
      return NextResponse.json(errorPayload, { status: response.status });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data);
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
