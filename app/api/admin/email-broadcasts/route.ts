import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');
const BACKEND_PATH = '/api/v1/email/broadcasts/';

function forwardHeaders(request: NextRequest): HeadersInit {
  const authHeader = request.headers.get('authorization');
  return {
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader } : {}),
  };
}

async function readResponse(response: Response) {
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text || null };
  }
  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}${BACKEND_PATH}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: forwardHeaders(request),
    });

    return readResponse(response);
  } catch (error) {
    console.error('❌ Email-broadcasts proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch email broadcasts',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}${BACKEND_PATH}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    });

    return readResponse(response);
  } catch (error) {
    console.error('❌ Email-broadcasts proxy (POST) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create email broadcast',
      },
      { status: 500 },
    );
  }
}
