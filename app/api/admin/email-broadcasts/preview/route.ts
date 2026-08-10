import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');
const BACKEND_PATH = '/api/v1/email/broadcasts/preview/';

function forwardHeaders(request: NextRequest): HeadersInit {
  const authHeader = request.headers.get('authorization');
  return {
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader } : {}),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}${BACKEND_PATH}`, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Email-broadcasts preview proxy error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to preview email broadcast recipients',
      },
      { status: 500 },
    );
  }
}
