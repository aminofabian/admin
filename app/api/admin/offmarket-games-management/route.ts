import { NextRequest, NextResponse } from 'next/server';

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.serverhub.biz';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    // Build query string from search params
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/v1/offmarket-games-management/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying GET offmarket-games-management request:', {
      backendUrl,
      hasAuth: !!authHeader,
      queryParams: Object.fromEntries(searchParams.entries()),
    });

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

    console.log('📥 Offmarket-games-management response status:', response.status);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Offmarket-games-management proxy (GET) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch offmarket games management data',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const body = await request.json();

    // Build query string from search params
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/v1/offmarket-games-management/${queryString ? `?${queryString}` : ''}`;

    console.log('🔷 Proxying POST offmarket-games-management request:', {
      backendUrl,
      hasAuth: !!authHeader,
      body,
      queryParams: Object.fromEntries(searchParams.entries()),
    });

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

    console.log('📥 Offmarket-games-management POST response status:', response.status);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Offmarket-games-management proxy (POST) error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process offmarket games management request',
      },
      { status: 500 },
    );
  }
}
