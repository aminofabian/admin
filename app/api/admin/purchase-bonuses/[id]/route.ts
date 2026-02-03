import { NextRequest, NextResponse } from 'next/server';

type RouteContextParams = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

function getId(params: Record<string, string | string[] | undefined>): string | null {
  const rawId = params?.id;
  return rawId ? (Array.isArray(rawId) ? rawId[0] : rawId) : null;
}

export async function PUT(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const id = getId(params);

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Purchase bonus ID is required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    const backendUrl = `${BACKEND_URL}/api/v1/purchase-bonuses/${id}/`;

    const response = await fetch(backendUrl, {
      method: 'PUT',
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
    console.error('❌ Purchase-bonuses proxy (PUT) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update purchase bonus',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const id = getId(params);

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Purchase bonus ID is required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    const backendUrl = `${BACKEND_URL}/api/v1/purchase-bonuses/${id}/`;

    const response = await fetch(backendUrl, {
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
    console.error('❌ Purchase-bonuses proxy (PATCH) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update purchase bonus',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const id = getId(params);

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Purchase bonus ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');
    const backendUrl = `${BACKEND_URL}/api/v1/purchase-bonuses/${id}/`;

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (response.status === 204 || response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Purchase-bonuses proxy (DELETE) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete purchase bonus',
      },
      { status: 500 },
    );
  }
}
