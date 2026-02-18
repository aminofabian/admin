import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { status: 'error', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/v1/chat/send/`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Chat send backend error:', response.status, text);
      return NextResponse.json(
        { status: 'error', message: `Failed to send message: ${response.status}` },
        { status: response.status }
      );
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
