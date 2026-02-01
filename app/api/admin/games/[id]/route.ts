import { NextRequest, NextResponse } from 'next/server';

type RouteContextParams = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

function getGameId(params: Record<string, string | string[] | undefined>): string | null {
  const rawId = params?.id;
  return rawId ? (Array.isArray(rawId) ? rawId[0] : rawId) : null;
}

export async function GET(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const id = getGameId(params);

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Game ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${BACKEND_URL}/api/v1/games/${id}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
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
    console.error('❌ Games proxy (GET) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch game',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const id = getGameId(params);

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Game ID is required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/games/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
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
    console.error('❌ Games proxy (PATCH) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update game',
      },
      { status: 500 },
    );
  }
}
