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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}${BACKEND_PATH}${encodeURIComponent(id)}/${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: forwardHeaders(request),
    });

    return readResponse(response);
  } catch (error) {
    console.error('❌ Email-broadcast proxy (GET by id) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch email broadcast',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = `${BACKEND_URL}${BACKEND_PATH}${encodeURIComponent(id)}/`;

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    });

    return readResponse(response);
  } catch (error) {
    console.error('❌ Email-broadcast proxy (PATCH) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update email broadcast draft',
      },
      { status: 500 },
    );
  }
}
