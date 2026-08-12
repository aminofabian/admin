import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

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

function backendUrlFor(action: string, searchParams: URLSearchParams) {
  const queryString = searchParams.toString();
  return `${BACKEND_URL}/api/v1/email/templates/${encodeURIComponent(action)}/${queryString ? `?${queryString}` : ''}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const { searchParams } = new URL(request.url);
    const response = await fetch(backendUrlFor(action, searchParams), {
      method: 'GET',
      headers: forwardHeaders(request),
    });

    return readResponse(response);
  } catch (error) {
    console.error('❌ Email-template proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch email template',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const response = await fetch(backendUrlFor(action, searchParams), {
      method: 'PATCH',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    });

    return readResponse(response);
  } catch (error) {
    console.error('❌ Email-template proxy (PATCH) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update email template',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const response = await fetch(backendUrlFor(action, searchParams), {
      method: 'PUT',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    });

    return readResponse(response);
  } catch (error) {
    console.error('❌ Email-template proxy (PUT) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update email template',
      },
      { status: 500 },
    );
  }
}
