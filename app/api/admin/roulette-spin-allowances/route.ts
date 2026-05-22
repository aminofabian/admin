import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const backendUrl = `${BACKEND_URL}/api/v1/roulette/spin-allowances/`;

    const response = await fetch(backendUrl, {
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
    console.error('❌ Roulette spin-allowances proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch roulette spin allowances',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/v1/roulette/spin-allowances/`;

    const response = await fetch(backendUrl, {
      method: 'POST',
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
    console.error('❌ Roulette spin-allowances proxy (POST) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save roulette spin allowances',
      },
      { status: 500 },
    );
  }
}
