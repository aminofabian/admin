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

export async function PATCH(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const id = getId(params);

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Referral promo code ID is required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    const backendUrl = `${BACKEND_URL}/api/v1/referral-promo-codes/${id}/`;

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
    console.error('❌ Referral-promo-codes proxy (PATCH) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to update referral promo code',
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
      { status: 'error', message: 'Referral promo code ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');
    const backendUrl = `${BACKEND_URL}/api/v1/referral-promo-codes/${id}/`;

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const text = await response.text();

    // NextResponse.json() cannot use status 204. Normalize successful deletes to 200 JSON.
    if (response.status === 204 || (response.ok && !text.trim())) {
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    if (response.ok) {
      let data: unknown = { status: 'success' };
      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }
      return NextResponse.json(data, { status: 200 });
    }

    let data: unknown;
    try {
      data = text ? JSON.parse(text) : { status: 'error', message: 'Delete failed' };
    } catch {
      data = { status: 'error', message: text || 'Delete failed' };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Referral-promo-codes proxy (DELETE) error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete referral promo code',
      },
      { status: 500 },
    );
  }
}
