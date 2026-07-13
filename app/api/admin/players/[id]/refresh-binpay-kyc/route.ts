import { NextRequest, NextResponse } from 'next/server';

type RouteContextParams = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

/**
 * Proxy: POST /api/v1/players/{id}/refresh-binpay-kyc/
 * Pulls current KYC status from BinPay and updates the player when webhooks are missed.
 */
export async function POST(request: NextRequest, context: RouteContextParams) {
  const params = await context.params;
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Player ID is required' },
      { status: 400 },
    );
  }

  try {
    const authHeader = request.headers.get('authorization');
    const backendUrl = `${BACKEND_URL}/api/v1/players/${id}/refresh-binpay-kyc/`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({}),
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
    console.error('❌ Refresh BinPay KYC proxy (POST) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to refresh BinPay KYC status',
      },
      { status: 500 },
    );
  }
}
