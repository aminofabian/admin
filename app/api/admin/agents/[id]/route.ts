import { NextRequest, NextResponse } from 'next/server';

type RouteContextParams = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

async function resolveAgentId(context: RouteContextParams): Promise<string | null> {
  const params = await context.params;
  const rawId = params?.id;
  return Array.isArray(rawId) ? rawId[0] ?? null : rawId ?? null;
}

export async function GET(request: NextRequest, context: RouteContextParams) {
  const id = await resolveAgentId(context);

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Agent ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/agents/${id}/`, {
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
    console.error('❌ Agent proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch agent',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContextParams) {
  const id = await resolveAgentId(context);

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Agent ID is required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/agents/${id}/`, {
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
    console.error('❌ Agent proxy (PATCH) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update agent',
      },
      { status: 500 },
    );
  }
}

