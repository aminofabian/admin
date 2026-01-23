import { NextRequest, NextResponse } from 'next/server';

type RouteContextParams = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function GET(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Payment method ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/payment-methods/${id}/`, {
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
    console.error('❌ Payment method proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch payment method',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Payment method ID is required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/payment-methods/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const text = await response.text();
    let data: unknown;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text || null };
    }

    if (!response.ok) {
      console.error('❌ Payment method update failed:', {
        status: response.status,
        statusText: response.statusText,
        body: data,
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Payment method proxy (PUT) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update payment method',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Payment method ID is required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/api/v1/payment-methods/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      credentials: 'include',
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
    console.error('❌ Payment method proxy (PATCH) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update payment method',
      },
      { status: 500 },
    );
  }
}
